import { motion } from "framer-motion";
import { 
  Bot, 
  Code2, 
  Image as ImageIcon, 
  Mic, 
  Zap, 
  ShieldCheck, 
  Terminal, 
  Cpu 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/FeatureCard";

export default function Home() {
  const handleStartChat = () => {
    window.open("https://t.me/your_bot_username", "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">AI Master Bot</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleStartChat}>
          Launch Telegram
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-20">
          <div className="absolute top-20 right-10 w-96 h-96 bg-primary rounded-full blur-[100px]" />
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-accent rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-sm">
              <Zap className="w-3 h-3" />
              <span>Next Generation AI Assistant</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight mb-6">
              Your Intelligent <br className="hidden sm:block" />
              <span className="text-gradient">Coding Companion</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Experience the future of automation directly in Telegram. 
              Generate code, analyze images, and converse with a cutting-edge 
              neural network designed for developers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="glow" onClick={handleStartChat} className="w-full sm:w-auto neon-glow">
                Start Chatting Now
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-white/10 hover:bg-white/5">
                View Features
              </Button>
            </div>
          </motion.div>

          {/* Hero Visual/Image Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 sm:mt-24 relative max-w-4xl mx-auto"
          >
            <div className="aspect-[16/9] rounded-2xl overflow-hidden glass-card border border-white/10 shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 opacity-60" />
              {/* Using a tech/code abstract image */}
              {/* tech abstract code screen */}
              <img 
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop" 
                alt="AI Interface Preview"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-8 z-20 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-5 h-5 text-accent" />
                  <span className="text-sm font-mono text-accent">Analysis Complete</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Advanced Code Generation</h3>
                <p className="text-white/70 mt-1">Capable of writing complex, production-ready code in seconds.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-32 relative bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Powerhouse Features</h2>
            <p className="text-muted-foreground">
              Built with the latest LLM technology to provide accurate, context-aware assistance for any task.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard 
              icon={Code2}
              title="Expert Coding"
              description="Generate boilerplate, debug issues, or write entire modules in Python, JavaScript, Rust, and more."
              delay={0.1}
            />
            <FeatureCard 
              icon={ImageIcon}
              title="Image Vision"
              description="Send any image for instant analysis. Extract text, identify objects, or get design feedback."
              delay={0.2}
            />
            <FeatureCard 
              icon={Mic}
              title="Voice Interaction"
              description="Speak naturally. The bot understands voice messages and responds with perfect clarity."
              delay={0.3}
            />
            <FeatureCard 
              icon={Cpu}
              title="Context Awareness"
              description="Remembers your conversation history to provide relevant, continuous assistance over time."
              delay={0.4}
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="VIP Access"
              description="Exclusive high-performance tier for power users requiring faster processing and higher limits."
              delay={0.5}
            />
            <FeatureCard 
              icon={Zap}
              title="Lightning Fast"
              description="Optimized for speed. Get answers immediately without waiting in long queues."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl sm:text-5xl font-display font-bold mb-6">Ready to upgrade your workflow?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Join thousands of developers using our AI bot to boost productivity and solve problems faster.
          </p>
          <Button size="lg" variant="glow" onClick={handleStartChat} className="px-10 text-lg h-14 rounded-full">
            Open in Telegram
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-lg">AI Master Bot</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AI Master Bot. All rights reserved.
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
