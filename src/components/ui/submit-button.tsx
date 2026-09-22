"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/** Button that shows a spinner while the surrounding <form action> is pending. */
export function SubmitButton(props: Omit<ButtonProps, "href" | "type" | "loading">) {
  const { pending } = useFormStatus();
  return <Button {...(props as ButtonProps)} type="submit" loading={pending} />;
}
