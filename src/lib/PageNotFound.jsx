import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.replace(/^\//, '');

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-md text-center">
                <div className="space-y-2">
                    <p className="font-display text-7xl font-light text-gold-300">404</p>
                    <div className="mx-auto h-0.5 w-16 bg-gold-200" />
                </div>

                <div className="mt-6 space-y-3">
                    <h1 className="font-display text-2xl font-semibold text-foreground">Page not found</h1>
                    <p className="leading-relaxed text-muted-foreground">
                        Nothing is routed at{' '}
                        <span className="font-medium text-foreground">{pageName || "/"}</span>. It may have been
                        renamed, or the link may belong to a role that cannot reach it.
                    </p>
                </div>

                <div className="mt-8">
                    <Link
                        to="/"
                        className="btn-primary"
                    >
                        <Home aria-hidden="true" className="h-4 w-4" />
                        Back to my home screen
                    </Link>
                </div>
            </div>
        </div>
    )
}