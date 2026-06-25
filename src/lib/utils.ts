import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortId(value: string, length = 8) {
  const normalized = value.replace(/-/g, "")
  return normalized.slice(0, length).toUpperCase()
}
