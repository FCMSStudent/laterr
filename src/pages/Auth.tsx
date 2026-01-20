import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedInput } from '@/shared/components/ui/input';
import { LoadingButton } from '@/shared/components/ui/loading-button';
import { useToast } from '@/shared/hooks/use-toast';
import { z } from 'zod';
import { AuthError, toTypedError } from '@/shared/types/errors';
import { AUTH_ERRORS, getAuthErrorMessage } from '@/shared/lib/error-messages';
import { Bookmark, Sparkles, Check, Mail, ArrowLeft, KeyRound } from 'lucide-react';
const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(72);
type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';
export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  // Success states
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  // Validation states
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>();
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
  });
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Check for password reset token in URL
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');
    if (type === 'recovery' || accessToken) {
      setMode('reset-password');
    }
  }, [searchParams]);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session && mode !== 'reset-password') {
        navigate('/app');
      }
    });
  }, [navigate, mode]);

  // Inline validation with useCallback to stabilize function reference
  const validateEmail = useCallback((value: string) => {
    if (!touched.email) return;
    if (!value) {
      setEmailError(undefined);
      return;
    }
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
    } else {
      setEmailError(undefined);
    }
  }, [touched.email]);
  const validatePassword = useCallback((value: string) => {
    if (!touched.password) return;
    if (!value) {
      setPasswordError(undefined);
      return;
    }
    const result = passwordSchema.safeParse(value);
    if (!result.success) {
      setPasswordError(result.error.errors[0].message);
    } else {
      setPasswordError(undefined);
    }
  }, [touched.password]);
  const validateConfirmPassword = useCallback((value: string) => {
    if (!touched.confirmPassword) return;
    if (!value) {
      setConfirmPasswordError(undefined);
      return;
    }
    if (value !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError(undefined);
    }
  }, [touched.confirmPassword, password]);
  useEffect(() => {
    validateEmail(email);
  }, [email, validateEmail]);
  useEffect(() => {
    validatePassword(password);
  }, [password, validatePassword]);
  useEffect(() => {
    validateConfirmPassword(confirmPassword);
  }, [confirmPassword, validateConfirmPassword]);
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailError(undefined);
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);
    setTouched({
      email: false,
      password: false,
      confirmPassword: false
    });
  };
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      confirmPassword: true
    });

    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    const passwordResult = passwordSchema.safeParse(password);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      toast({
        title: AUTH_ERRORS.INVALID_EMAIL.title,
        description: AUTH_ERRORS.INVALID_EMAIL.message,
        variant: 'destructive'
      });
      return;
    }
    if (!passwordResult.success) {
      setPasswordError(passwordResult.error.errors[0].message);
      toast({
        title: AUTH_ERRORS.INVALID_PASSWORD.title,
        description: AUTH_ERRORS.INVALID_PASSWORD.message,
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast({
          title: 'Welcome back!',
          description: 'Successfully signed in.'
        });
        navigate('/app');
      } else if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/app`;
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (error: unknown) {
      const errorMessage = getAuthErrorMessage(error);
      const typedError = toTypedError(error);
      const authError = new AuthError(errorMessage.message, typedError);
      toast({
        title: errorMessage.title,
        description: authError.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      ...touched,
      email: true
    });
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth?type=recovery`;
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (error: unknown) {
      const errorMessage = getAuthErrorMessage(error);
      toast({
        title: errorMessage.title,
        description: errorMessage.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      ...touched,
      password: true,
      confirmPassword: true
    });
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setPasswordError(passwordResult.error.errors[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      setPasswordResetSuccess(true);
    } catch (error: unknown) {
      const errorMessage = getAuthErrorMessage(error);
      toast({
        title: errorMessage.title,
        description: errorMessage.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleResendEmail = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/app`;
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      if (error) throw error;
      toast({
        title: 'Email sent!',
        description: 'Check your inbox for the confirmation email.'
      });
    } catch (error: unknown) {
      const errorMessage = getAuthErrorMessage(error);
      toast({
        title: errorMessage.title,
        description: errorMessage.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Visual illustration component (returns null - no illustration)

  // Success state for signup
  if (signupSuccess) {
    return <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-10 shadow-apple">
            <div className="animate-in zoom-in-50 duration-500 text-center">
              {/* Success checkmark */}
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">Account Created!</h2>
              
              <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{email}</span>
              </div>
              
              <p className="text-muted-foreground text-sm mb-8">
                We've sent a confirmation email to your inbox. Click the link to activate your account.
              </p>
              
              <LoadingButton onClick={() => {
              setSignupSuccess(false);
              setMode('login');
              resetForm();
            }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]">
                Continue to Sign In
              </LoadingButton>
              
              <button onClick={handleResendEmail} disabled={loading} className="mt-4 text-primary hover:text-primary/80 text-sm font-medium smooth-transition hover:underline disabled:opacity-50">
                Didn't receive it? Resend email
              </button>
            </div>
          </div>
        </div>
      </div>;
  }

  // Success state for password reset email sent
  if (resetEmailSent) {
    return <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-10 shadow-apple">
            <div className="animate-in zoom-in-50 duration-500 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">Check Your Email</h2>
              
              <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
                <span className="text-sm">{email}</span>
              </div>
              
              <p className="text-muted-foreground text-sm mb-8">
                We've sent you a password reset link. Click it to set a new password.
              </p>
              
              <LoadingButton onClick={() => {
              setResetEmailSent(false);
              setMode('login');
              resetForm();
            }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]">
                Back to Sign In
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>;
  }

  // Success state for password reset complete
  if (passwordResetSuccess) {
    return <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-10 shadow-apple">
            <div className="animate-in zoom-in-50 duration-500 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">Password Updated!</h2>
              
              <p className="text-muted-foreground text-sm mb-8">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              
              <LoadingButton onClick={() => {
              setPasswordResetSuccess(false);
              setMode('login');
              resetForm();
              navigate('/auth');
            }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]">
                Continue to Sign In
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>;
  }

  // Forgot password form
  if (mode === 'forgot-password') {
    return <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-10 shadow-apple">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Forgot Password?</h2>
              <p className="text-muted-foreground text-sm">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <EnhancedInput id="email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setTouched({
              ...touched,
              email: true
            })} required maxLength={255} className="glass-input h-12 text-base" prefixIcon="email" error={emailError} success={!emailError && email.length > 0 && touched.email} showClearButton={true} onClear={() => setEmail('')} autoComplete="email" aria-label="Email address" />

              <LoadingButton type="submit" loading={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]">
                Send Reset Link
              </LoadingButton>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => {
              setMode('login');
              resetForm();
            }} className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium smooth-transition hover:underline">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>;
  }

  // Reset password form (when user clicks link from email)
  if (mode === 'reset-password') {
    return <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-10 shadow-apple">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Set New Password</h2>
              <p className="text-muted-foreground text-sm">
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <EnhancedInput id="password" type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} onBlur={() => setTouched({
              ...touched,
              password: true
            })} required maxLength={72} className="glass-input h-12 text-base" prefixIcon="password" error={passwordError} success={!passwordError && password.length > 0 && touched.password} showPasswordToggle={true} autoComplete="new-password" aria-label="New password" />
              
              <EnhancedInput id="confirmPassword" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={() => setTouched({
              ...touched,
              confirmPassword: true
            })} required maxLength={72} className="glass-input h-12 text-base" prefixIcon="password" error={confirmPasswordError} success={!confirmPasswordError && confirmPassword.length > 0 && touched.confirmPassword && password === confirmPassword} showPasswordToggle={true} autoComplete="new-password" aria-label="Confirm new password" />

              <LoadingButton type="submit" loading={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]">
                Update Password
              </LoadingButton>
            </form>
          </div>
        </div>
      </div>;
  }

  // Main login/signup form
  return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-3xl p-10 shadow-apple">
          
          <div className="text-left mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Laterr</h1>
            <p className="text-muted-foreground text-sm">Your personal knowledge space</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <EnhancedInput id="email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setTouched({
            ...touched,
            email: true
          })} required maxLength={255} className="glass-input h-12 text-base" prefixIcon="email" error={emailError} success={!emailError && email.length > 0 && touched.email} showClearButton={true} onClear={() => setEmail('')} autoComplete="email" aria-label="Email address" />
            
            <div className="space-y-2">
              <EnhancedInput id="password" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onBlur={() => setTouched({
              ...touched,
              password: true
            })} required maxLength={72} className="glass-input h-12 text-base" prefixIcon="password" error={passwordError} success={!passwordError && password.length > 0 && touched.password} showPasswordToggle={true} autoComplete={mode === 'login' ? "current-password" : "new-password"} aria-label="Password" />
              
              {mode === 'login' && <div className="text-left">
                  <button type="button" onClick={() => {
                setMode('forgot-password');
                setPassword('');
                setPasswordError(undefined);
                setTouched({
                  ...touched,
                  password: false
                });
              }} className="text-xs text-muted-foreground hover:text-primary smooth-transition">
                    Forgot password?
                  </button>
                </div>}
            </div>
            
            {mode === 'signup' && !passwordError && <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters
              </p>}

            <LoadingButton type="submit" loading={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl premium-transition hover:scale-[1.02]">
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </LoadingButton>
          </form>

          <div className="mt-8 text-left">
            <button onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            resetForm();
          }} className="text-primary hover:text-primary/80 text-sm font-medium smooth-transition hover:underline">
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>;
}
