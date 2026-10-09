import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"AgriPilot · OS Agricole",description:"Pilotage multi-entreprise des exploitations agricoles.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg"},appleWebApp:{capable:true,title:"AgriPilot",statusBarStyle:"black-translucent"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
