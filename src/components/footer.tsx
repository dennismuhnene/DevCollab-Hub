import Link from 'next/link';
import { Code2 } from 'lucide-react';

const NeuralAxisLogo = () => (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
        <g clipPath="url(#clip0_footer_logo)">
            {/* Use currentColor to inherit the text color from the parent anchor tag */}
            <path d="M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100Z" fill="currentColor"/>
            <path d="M50.0002 91.6667C72.9926 91.6667 91.6668 72.9924 91.6668 50C91.6668 27.0076 72.9926 8.33331 50.0002 8.33331C27.0078 8.33331 8.3335 27.0076 8.3335 50C8.3335 72.9924 27.0078 91.6667 50.0002 91.6667Z" stroke="#F1B302" strokeWidth="3"/>
            <path d="M62.6375 29.1667L81.25 62.5H68.75L62.6375 52.0833V29.1667Z" fill="#F1B302"/>
            <path d="M62.6375 29.1667L43.75 62.5H56.25L62.6375 52.0833V29.1667Z" fill="#F1B3.2"/>
            <path d="M37.5 70.8333L25 45.8333H33.3333L37.5 54.1667L41.6667 45.8333H50L37.5 70.8333Z" fill="#F1B302"/>
            <path d="M37.5 37.5C39.1543 37.5 40.686 36.8417 41.8398 35.688C42.9935 34.5342 43.6518 33.0024 43.6518 31.3481C43.6518 29.6938 42.9935 28.162 41.8398 27.0082C40.686 25.8545 39.1543 25.1962 37.5 25.1962C35.8457 25.1962 34.314 25.8545 33.1602 27.0082C32.0065 28.162 31.3481 29.6938 31.3481 31.3481C31.3481 33.0024 32.0065 34.5342 33.1602 35.688C34.314 36.8417 35.8457 37.5 37.5 37.5Z" stroke="#F1B302" strokeWidth="3"/>
            <path d="M18.75 41.6667H31.25" stroke="#F1B302" strokeWidth="3"/>
            <path d="M18.75 50H31.25" stroke="#F1B302" strokeWidth="3"/>
        </g>
        <defs>
            <clipPath id="clip0_footer_logo">
                <rect width="100" height="100" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);


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
                        <a href="https://neuralaxislabs.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors">
                            <NeuralAxisLogo />
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
