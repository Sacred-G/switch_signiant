import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { SigniantAuth } from '../services/auth';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const validatePassword = (password) => {
        if (password.length < 6) {
            return 'Password must be at least 6 characters long';
        }
        return null;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Validate passwords match
        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match",
                variant: "destructive",
            });
            return;
        }

        // Validate password strength
        const passwordError = validatePassword(password);
        if (passwordError) {
            toast({
                title: "Error",
                description: passwordError,
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            await SigniantAuth.register(email, password);
            
            toast({
                title: "Success",
                description: "Registration successful. Please check your email for verification.",
            });

            // Redirect to login page after successful registration
            navigate('/login');
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = error.message;
            
            // Handle specific error cases
            if (errorMessage.includes('cannot be used as it is not authorized')) {
                errorMessage = 'This email domain is not authorized for registration. Please contact your administrator.';
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Card className="w-full max-w-md">
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold">Create Account</h1>
                        <p className="text-gray-500 mt-2">Register for monitoring access</p>
                        <p className="text-sm text-gray-500 mt-2">Note: Registration is restricted to authorized email domains.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
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
                                className="w-full"
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
                                autoComplete="new-password"
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500">
                                Password must be at least 6 characters long
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Confirm Password
                            </label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                required
                                autoComplete="new-password"
                                className="w-full"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </Button>

                        <div className="text-center text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default RegisterPage;
