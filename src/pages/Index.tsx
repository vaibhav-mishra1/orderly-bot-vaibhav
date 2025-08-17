import { ChatInterface } from '@/components/ChatInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with gradient */}
      <header className="gradient-header text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-2">
          Orderly – Your Smart Order Assistant ✨
        </h1>
        <p className="text-white/90 text-lg">
          Place your order in a simple, conversational way
        </p>
      </header>

      {/* Chat Interface */}
      <main className="flex-1 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  );
};

export default Index;
