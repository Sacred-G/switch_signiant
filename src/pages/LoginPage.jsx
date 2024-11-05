import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { SigniantAuth } from '../services/auth';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Set default email and password if fields are empty
        const defaultEmail = 'test@test.com';
        const defaultPassword = 'Password123';

        const loginEmail = email.trim() === '' ? defaultEmail : email;
        const loginPassword = password.trim() === '' ? defaultPassword : password;

        try {
            await SigniantAuth.login(loginEmail, loginPassword);
            
            // Check if authentication was successful
            const isAuthenticated = await SigniantAuth.isAuthenticated();
            if (!isAuthenticated) {
                throw new Error('Authentication failed. Please try again.');
            }

            toast({
                title: "Success",
                description: "Successfully logged in",
            });

            navigate('/');
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = error.message;

            // Handle specific error cases
            if (errorMessage.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password';
            } else if (errorMessage.includes('Email not confirmed')) {
                errorMessage = 'Please verify your email address before logging in';
            }

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await SigniantAuth.signInWithGoogle();
            // Note: No need to navigate here as the OAuth redirect will handle it
        } catch (error) {
            console.error('Google login error:', error);
            toast({
                title: "Error",
                description: error.message || 'Failed to sign in with Google',
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Card className="w-full max-w-md">
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold">Sign In</h1>
                        <p className="text-gray-500 mt-2">Access Signiant Dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Password
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleLogin}
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Sign in with Google
                    </Button>

                    <div className="text-center text-sm">
                        Need an account?{' '}
                        <Link to="/register" className="text-blue-600 hover:underline">
                            Create one
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;
