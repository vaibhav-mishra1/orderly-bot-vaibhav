import { ChatInterface } from '@/components/ChatInterface';

const Index = () => {
  return (
    <div className="min-h-screen chat-container">
      {/* Restaurant-style header */}
      <header className="restaurant-header text-white p-8 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">🍽️</span>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text">
              Orderly
            </h1>
            <span className="text-4xl">🤖</span>
          </div>
          <p className="text-white/90 text-xl font-medium mb-2">
            Your Smart Food Ordering Assistant
          </p>
          <p className="text-white/75 text-lg">
            Simply chat with me to place your delicious order! 🍕✨
          </p>
        </div>
        
        {/* Floating food emojis */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute top-4 left-4 text-3xl opacity-20 animate-bounce">🍰</span>
          <span className="absolute top-8 right-8 text-3xl opacity-20 animate-bounce" style={{animationDelay: '0.5s'}}>🥗</span>
          <span className="absolute bottom-6 left-8 text-3xl opacity-20 animate-bounce" style={{animationDelay: '1s'}}>🍔</span>
          <span className="absolute bottom-4 right-4 text-3xl opacity-20 animate-bounce" style={{animationDelay: '1.5s'}}>🍕</span>
        </div>
      </header>

      {/* Chat Interface with food background */}
      <main className="flex-1 flex flex-col food-bg">
        <ChatInterface />
      </main>
    </div>
  );
};

export default Index;
