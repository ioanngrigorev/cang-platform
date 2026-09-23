import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-on-brand hover:bg-brand-600 shadow-sm",
        accent: "bg-brass-500 text-ink-950 hover:bg-brass-400 shadow-sm font-semibold",
        secondary: "border border-steel-300 bg-white text-ink-900 hover:bg-steel-50 hover:border-steel-400",
        ghost: "text-steel-700 hover:bg-steel-100 hover:text-ink-900",
        danger: "bg-danger-600 text-white hover:bg-danger-700",
        link: "text-ink-700 underline-offset-4 hover:underline px-0 h-auto",
        subtle: "bg-ink-50 text-ink-800 hover:bg-ink-100",
      },
      size: {
        xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "h-9 w-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type BaseProps = VariantProps<typeof buttonVariants> & {
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps = BaseProps &
  (
    | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">)
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  );

export function Button(props: ButtonProps) {
  const { variant, size, loading, className, children, ...rest } = props;
  const classes = cn(buttonVariants({ variant, size }), className);
  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkProps } = rest as { href: string } & Omit<React.ComponentProps<typeof Link>, "href">;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }
  const { disabled, type = "button", ...buttonProps } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...buttonProps}>
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
