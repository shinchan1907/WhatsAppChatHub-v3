import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Eye, EyeOff, Lock, Mail, User, Smartphone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignup) {
      await handleSignup();
    } else {
      await handleLogin();
    }
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both identifier (username/email) and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Attempting login...");
      const result = await login(identifier, password);
      console.log("Login result:", result);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Redirect to dashboard immediately
      console.log("Redirecting to dashboard...");
      window.location.href = "/dashboard";
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!username || !email || !password || !firstName || !lastName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          firstName,
          lastName,
          organizationName: organizationName || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account created!",
          description: "Your account has been created successfully. Please log in.",
        });
        setIsSignup(false);
        // Clear form
        setUsername("");
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setOrganizationName("");
      } else {
        throw new Error(data.message || "Signup failed");
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Hub</h1>
          <p className="text-gray-600">Enterprise-grade messaging platform</p>
        </div>

        {/* Login/Signup Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              {isSignup ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isSignup 
                ? "Sign up to start using WhatsApp Business Hub" 
                : "Sign in to your account to continue"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="firstName"
                          placeholder="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10 bg-gray-50 border-gray-200"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="bg-gray-50 border-gray-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="username"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-gray-50 border-gray-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-gray-50 border-gray-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Organization Name */}
                  <div>
                    <Label htmlFor="organizationName">Organization Name (Optional)</Label>
                    <Input
                      id="organizationName"
                      placeholder="Your company name"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </>
              )}

              {!isSignup && (
                <>
                  {/* Identifier (Username or Email) */}
                  <div>
                    <Label htmlFor="identifier">Username or Email *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="identifier"
                        placeholder="Enter username or email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="pl-10 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignup ? "Create a password" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isSignup ? "Creating Account..." : "Signing in..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{isSignup ? "Create Account" : "Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Toggle between Login and Signup */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <Button
                  type="button"
                  variant="link"
                  className="text-green-600 hover:text-green-700 p-0 h-auto text-sm"
                  onClick={() => setIsSignup(!isSignup)}
                >
                  {isSignup ? "Sign in" : "Sign up"}
                </Button>
              </p>
            </div>

            {/* Alternative Sign-in Options */}
            {!isSignup && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-gray-200 hover:bg-gray-50"
                    disabled
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    WhatsApp Business API
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2024 WhatsApp Business Hub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
