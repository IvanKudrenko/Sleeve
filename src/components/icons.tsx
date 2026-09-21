import type { SVGProps } from 'react'

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>
export const GearIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></Icon>
export const ExpandIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></Icon>
export const CloseIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="m5 5 14 14M19 5 5 19"/></Icon>
export const PlayIcon = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="m8 5 11 7-11 7z"/></svg>
export const PauseIcon = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>
export const SkipIcon = ({ back, ...props }: SVGProps<SVGSVGElement> & { back?: boolean }) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: back ? 'scaleX(-1)' : undefined }} {...props}><path d="m6 5 10 7L6 19zm11 0h2v14h-2z"/></svg>
