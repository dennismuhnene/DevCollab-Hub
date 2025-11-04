import Link from 'next/link';
import { Code2 } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-background border-t border-border/40">
            <div className="container mx-auto max-w-screen-xl px-4 md:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Code2 className="h-6 w-6" />
                        <span className="font-bold">DevCollab Hub</span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-4 md:mt-0">
                        &copy; {new Date().getFullYear()} DevCollab Hub. All rights reserved.
                    </p>
                    <div className="flex space-x-4 mt-4 md:mt-0">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
                    </div>
                </div>
            </div>
      </footer>
    )
}
