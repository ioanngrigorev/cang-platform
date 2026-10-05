import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const oldSha='a'.repeat(40), newSha='b'.repeat(40);
for(const mode of ['success','build-failure','health-failure','backup-failure']) {
  test(`deployment ${mode} preserves state and verifies rollback`, () => {
    const root=mkdtempSync(path.join(tmpdir(),'cang-deploy-test-'));
    const app=path.join(root,'app'), source=path.join(root,'source'), bin=path.join(root,'bin');
    for(const dir of [app,source,bin,path.join(app,'deploy'),path.join(source,'deploy')])mkdirSync(dir,{recursive:true});
    const executable=(name:string,body:string)=>{const file=path.join(bin,name);writeFileSync(file,'#!/bin/bash\nset -eu\n'+body);chmodSync(file,0o755)};
    writeFileSync(path.join(app,'docker-compose.yml'),'old config');
    writeFileSync(path.join(source,'docker-compose.yml'),'new config');
    writeFileSync(path.join(app,'.env'),'PRIVATE_TEST_VALUE=preserved');
    writeFileSync(path.join(app,'.autodeploy-paused'),'');
    writeFileSync(path.join(app,'.deployed-sha'),oldSha);
    writeFileSync(path.join(app,'deploy/backup.sh'),'#!/bin/bash\n[ "$MODE" != backup-failure ]\n');
    writeFileSync(path.join(source,'deploy/backup.sh'),'#!/bin/bash\nexit 0\n');
    writeFileSync(path.join(root,'image'),'old');
    const archive=path.join(root,'source.tgz');
    assert.equal(spawnSync('tar',['czf',archive,'-C',root,'source']).status,0);
    executable('curl',`while [ "$#" -gt 0 ]; do if [ "$1" = -o ]; then cp "$ARCHIVE" "$2"; exit 0; fi; shift; done\nexit 1\n`);
    executable('sleep','exit 0\n');
    executable('docker',`
      echo "$*" >> "$MOCK_ROOT/commands"
      case "$*" in
        'compose ps -q app') echo container ;;
        'inspect --format {{.Image}} container') echo old-image ;;
        'compose config --format json') echo '{"services":{"app":{"image":"custom/app:latest"}}}' ;;
        'compose build app') [ "$MODE" != build-failure ]; echo new > "$MOCK_ROOT/image" ;;
        'tag old-image custom/app:latest') echo old > "$MOCK_ROOT/image" ;;
        'compose exec -T app wget '*)
          image="$(cat "$MOCK_ROOT/image")"
          if [ "$MODE" = health-failure ] && [ "$image" = new ]; then exit 1; fi
          if [ "$image" = new ]; then echo '{"status":"ok","version":"${newSha}"}'; else echo '{"status":"ok","version":"${oldSha}"}'; fi ;;
      esac
    `);
    try {
      const result=spawnSync('bash',[path.resolve('deploy/update.sh'),newSha],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,APP_DIR:app,TOKEN_FILE:path.join(root,'no-token'),CANG_DEPLOY_LOCK_HELD:'1',MODE:mode,MOCK_ROOT:root,ARCHIVE:archive},timeout:30000});
      assert.equal(result.status,mode==='success'?0:1,result.stdout+result.stderr);
      assert.equal(readFileSync(path.join(app,'.env'),'utf8'),'PRIVATE_TEST_VALUE=preserved');
      assert.ok(existsSync(path.join(app,'.autodeploy-paused')));
      assert.equal(readFileSync(path.join(app,'docker-compose.yml'),'utf8'),mode==='success'?'new config':'old config');
      assert.equal(readFileSync(path.join(app,'.deployed-sha'),'utf8').trim(),mode==='success'?newSha:oldSha);
      if(mode==='build-failure'||mode==='health-failure')assert.match(result.stdout,/rollback verified/);
      if(mode!=='success')assert.equal(readFileSync(path.join(app,'.failed-sha'),'utf8').trim(),newSha);
    } finally {rmSync(root,{recursive:true,force:true})}
  });
}
