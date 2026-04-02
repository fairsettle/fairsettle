import * as React from 'react'

export function Form({
  children,
  ...props
}: React.ComponentProps<'form'>) {
  return <form {...props}>{children}</form>
}

export function FormField({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

export function FormItem({
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return <div {...props}>{children}</div>
}

export function FormLabel({
  children,
  ...props
}: React.ComponentProps<'label'>) {
  return <label {...props}>{children}</label>
}

export function FormControl({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

export function FormDescription({
  children,
  ...props
}: React.ComponentProps<'p'>) {
  return <p {...props}>{children}</p>
}

export function FormMessage({
  children,
  ...props
}: React.ComponentProps<'p'>) {
  return <p {...props}>{children}</p>
}
