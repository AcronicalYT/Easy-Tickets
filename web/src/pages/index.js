import { useSession, signIn } from "next-auth/react";
import Link from 'next/link';
import { PanelRight, MessageSquare, ShieldCheck, ArrowRight, Zap, Combine, LogIn } from 'lucide-react';

export default function LandingPage() {
    const { data: session } = useSession();

    const features = [
        {
            icon: PanelRight,
            title: "Dedicated Staff Panel",
            description: "Move staff conversations out of Discord and into a clean, dedicated web interface for efficient ticket management."
        },
        {
            icon: MessageSquare,
            title: "Real-time Sync",
            description: "Messages are synced instantly between your Discord threads and the web panel, ensuring no communication is missed."
        },
        {
            icon: ShieldCheck,
            title: "Access Control",
            description: "Use Discord roles to define exactly who can access the panel and manage tickets, keeping your support system secure."
        },
        {
            icon: Zap,
            title: "Advanced Management",
            description: "Assign tickets to specific staff members, set priorities, and add custom tags for a highly organized workflow."
        }
    ];

    return (
        <div className="bg-neutral-950 text-neutral-200 font-sans">
            {/* Header */}
            <header className="py-4 px-4 sm:px-8 border-b border-neutral-800">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <Combine className="h-8 w-8 text-indigo-400" />
                        <h1 className="text-xl font-bold ml-2">EasyTickets</h1>
                    </div>
                    <div>
                        {session ? (
                            <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <button onClick={() => signIn('discord')} className="flex items-center px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 transition-colors text-sm font-medium">
                                <LogIn className="h-4 w-4 mr-2" />
                                Staff Login
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="text-center py-20 md:py-32 px-4 border-b border-neutral-800">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
                            A Better Way to Handle Support
                        </h2>
                        <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
                            Elevate your Discord support system with a powerful web panel for your staff and a seamless experience for your users.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <a href="https://discord.com/oauth2/authorize?client_id=1387776151040294952" target="_blank" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold shadow-lg">
                                Add to Discord <ArrowRight className="h-4 w-4 ml-2" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 md:py-24 px-4 bg-neutral-900">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center">
                            <h3 className="text-3xl font-bold">Everything Your Support Team Needs</h3>
                            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">A full suite of tools designed to make ticket management faster, easier, and more professional.</p>
                        </div>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {features.map((feature, index) => (
                                <div key={index} className="p-6 bg-neutral-950 border border-neutral-800 rounded-lg">
                                    <feature.icon className="h-8 w-8 text-indigo-400 mb-4" />
                                    <h4 className="text-lg font-bold text-neutral-100">{feature.title}</h4>
                                    <p className="mt-2 text-sm text-neutral-400">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-neutral-800">
                <div className="max-w-7xl mx-auto text-center text-sm text-neutral-500">
                    <p>&copy; {new Date().getFullYear()} EasyTickets. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
