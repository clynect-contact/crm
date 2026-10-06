import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"AgriPilot · OS Agricole",description:"Pilotage multi-entreprise des exploitations agricoles.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
