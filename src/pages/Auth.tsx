import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { formatError } from '@/lib/error-utils';
import { AuthError, toTypedError } from '@/types/errors';
import { AUTH_ERRORS, getAuthErrorMessage } from '@/lib/error-messages';

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(72);

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    const passwordResult = passwordSchema.safeParse(password);

    if (!emailResult.success) {
      toast({
        title: AUTH_ERRORS.INVALID_EMAIL.title,
        description: AUTH_ERRORS.INVALID_EMAIL.message,
        variant: 'destructive',
      });
      return;
    }

    if (!passwordResult.success) {
      toast({
        title: AUTH_ERRORS.INVALID_PASSWORD.title,
        description: AUTH_ERRORS.INVALID_PASSWORD.message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: 'Welcome back!',
          description: 'Successfully signed in.',
        });
        navigate('/');
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        
        if (error) throw error;
        
        toast({
          title: 'Account created!',
          description: 'You can now sign in.',
        });
        setIsLogin(true);
      }
    } catch (error: unknown) {
      const errorMessage = getAuthErrorMessage(error);
      const typedError = toTypedError(error);
      const authError = new AuthError(
        errorMessage.message,
        typedError
      );
      
      toast({
        title: errorMessage.title,
        description: authError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-10 shadow-apple">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">Laterr</h1>
            <p className="text-muted-foreground text-base">Your personal knowledge space</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="glass-input h-12 text-base"
              />
            </div>
            
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={72}
                className="glass-input pr-12 h-12 text-base"
                aria-label="Password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50 rounded-lg smooth-transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            </div>
            
            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]"
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 text-sm font-medium smooth-transition hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
