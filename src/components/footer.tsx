import Link from 'next/link';
import Image from 'next/image';
import { Code2 } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-background border-t border-border/40">
            <div className="container mx-auto max-w-screen-xl px-4 md:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-2">
                        <Code2 className="h-6 w-6" />
                        <span className="font-bold">DevCollab Hub</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()}</p>
                        <span className="hidden sm:inline-block">A project by</span>
                        <a href="https://neuralaxislabs.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
                            <Image
                                src="/images/neuralaxis-logo.png"
                                alt="NeuralAxis Labs Logo"
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full flex-shrink-0"
                            />
                            <span>NeuralAxis Labs</span>
                        </a>
                    </div>
                    
                    <div className="flex space-x-4">
                        <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
                        <Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
                    </div>
                </div>
            </div>
      </footer>
    )
}
