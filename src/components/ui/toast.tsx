import * as React from 'react'

export function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

export function ToastViewport({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={className} {...props} />
}

export function Toast({
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return <div {...props}>{children}</div>
}

export function ToastTitle({
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return <div {...props}>{children}</div>
}

export function ToastDescription({
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return <div {...props}>{children}</div>
}

export function ToastAction({
  children,
  ...props
}: React.ComponentProps<'button'>) {
  return <button type="button" {...props}>{children}</button>
}

export function ToastClose(props: React.ComponentProps<'button'>) {
  return <button type="button" {...props} />
}
