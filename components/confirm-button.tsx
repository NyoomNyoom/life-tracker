"use client";

import type { ComponentProps } from "react";
import { buttonClass, cx } from "./ui";

/** Submit button that asks for confirmation first. Use inside a <form action={serverAction}>. */
export function ConfirmButton({
  message,
  variant = "danger",
  size = "md",
  block,
  className,
  ...rest
}: ComponentProps<"button"> & { message: string; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; block?: boolean }) {
  return (
    <button
      type="submit"
      className={cx(buttonClass(variant, size, block), className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    />
  );
}
