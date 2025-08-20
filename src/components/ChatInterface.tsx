import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Send, User, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface CustomerDetails {
  name: string;
  email: string;
  address: string;
  phone?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderDetails {
  items: OrderItem[];
  total: number;
  valid: boolean;
}

const MENU_ITEMS = [
  { name: 'Chocolate Cake', price: 350, emoji: '🍫' },
  { name: 'Blueberry Cheesecake', price: 420, emoji: '🫐' },
  { name: 'Mango Tart', price: 280, emoji: '🥭' },
  { name: 'Red Velvet Cake', price: 400, emoji: '❤️🎂' },
  { name: 'Carrot Cake', price: 300, emoji: '🥕🍰' },
  { name: 'Coffee & Walnut Cake', price: 380, emoji: '☕️🌰' },
  { name: 'Strawberry Cheesecake', price: 420, emoji: '🍓🍰' },
  { name: 'Chocolate Tart', price: 260, emoji: '🍫🍮' },
  { name: 'Fruit Tart', price: 350, emoji: '🍑🥝🍓' },
];

enum ConversationStep {
  GREETING = 'greeting',
  NAME = 'name',
  EMAIL = 'email',
  ADDRESS = 'address',
  PHONE = 'phone',
  MENU = 'menu',
  ORDER = 'order',
  CONFIRMATION = 'confirmation',
  COMPLETE = 'complete'
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>(ConversationStep.GREETING);
  const [customerDetails, setCustomerDetails] = useState<Partial<CustomerDetails>>({});
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addBotMessage = (text: string, delay = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(text, 'bot');
    }, delay);
  };

  const validateOrder = async (orderText: string): Promise<{ valid: boolean; message?: string; orderDetails?: OrderDetails; orderId?: string }> => {
    try {
      const response = await fetch('https://arcadebunny.app.n8n.cloud/webhook/b9d3b678-595a-4d83-9e6e-57d935a20d4d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderText,
          customerDetails,
          menuItems: MENU_ITEMS,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Handle array response format
      if (Array.isArray(data) && data.length > 0) {
        const orderResponse = data[0];
        
        if (orderResponse.status === 'valid') {
          // Parse items from the webhook response
          const items = orderResponse.items.split(' = ')[0]; // "Coffee & Walnut Cake x 2"
          const [itemName, quantityPart] = items.split(' x ');
          const quantity = parseInt(quantityPart);
          const menuItem = MENU_ITEMS.find(item => item.name === itemName.trim());
          
          if (menuItem) {
            const orderDetails: OrderDetails = {
              items: [{
                name: menuItem.name,
                quantity: quantity,
                price: menuItem.price,
                subtotal: orderResponse.totalPrice
              }],
              total: orderResponse.totalPrice,
              valid: true
            };
            
            return {
              valid: true,
              orderDetails,
              orderId: orderResponse.order_id
            };
          }
        }
        
        return {
          valid: false,
          message: orderResponse.message || 'Sorry, I couldn\'t understand your order.'
        };
      }
      
      return {
        valid: false,
        message: 'Sorry, there was an error processing your order. Please try again.',
      };
    } catch (error) {
      console.error('Error validating order:', error);
      return {
        valid: false,
        message: 'Sorry, there was an error processing your order. Please try again.',
      };
    }
  };

  const confirmOrder = async (orderId: string, confirm: 'yes' | 'no') => {
    try {
      const response = await fetch('https://arcadebunny.app.n8n.cloud/webhook/b9d3b678-595a-4d83-9e6e-57d935a20d4d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          confirm: confirm
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('Error confirming order:', error);
      return null;
    }
  };

  const formatMenuDisplay = () => {
    return MENU_ITEMS.map(item => 
      `${item.emoji} ${item.name} — ₹${item.price}`
    ).join('\n\n');
  };

  const formatOrderConfirmation = (orderDetails: OrderDetails, orderId?: string) => {
    const itemsList = orderDetails.items.map(item => 
      `${item.quantity} × ${item.name}`
    ).join('\n');
    
    let confirmation = `Perfect 🎉 Your order is:\n${itemsList}\nTotal: ₹${orderDetails.total}`;
    
    if (orderId) {
      confirmation += `\nOrder ID: ${orderId}`;
    }
    
    confirmation += '\nThank you for choosing us!';
    
    return confirmation;
  };

  const handleUserInput = async (input: string) => {
    addMessage(input, 'user');
    setInputValue('');

    switch (currentStep) {
      case ConversationStep.NAME:
        setCustomerDetails(prev => ({ ...prev, name: input }));
        addBotMessage(`Great ${input}! Could you share your email so I can send your confirmation?`);
        setCurrentStep(ConversationStep.EMAIL);
        break;

      case ConversationStep.EMAIL:
        if (!input.includes('@')) {
          addBotMessage('Please provide a valid email address.');
          return;
        }
        setCustomerDetails(prev => ({ ...prev, email: input }));
        addBotMessage('Thanks! What\'s your delivery address?');
        setCurrentStep(ConversationStep.ADDRESS);
        break;

      case ConversationStep.ADDRESS:
        setCustomerDetails(prev => ({ ...prev, address: input }));
        addBotMessage(`Perfect! Here's today's menu:\n\n${formatMenuDisplay()}\n\nWhat would you like to order today?\n\nYou can order by telling me something like: "2 chocolate cakes and 1 mango tart"`);
        setCurrentStep(ConversationStep.ORDER);
        break;

      case ConversationStep.ORDER:
        setIsTyping(true);
        const validation = await validateOrder(input);
        setIsTyping(false);
        
        if (validation.valid && validation.orderDetails) {
          setOrderDetails(validation.orderDetails);
          setCurrentOrderId(validation.orderId || null);
          addMessage(formatOrderConfirmation(validation.orderDetails, validation.orderId), 'bot');
          addBotMessage('Your order is ready. Please confirm by saying Yes or No.', 500);
          setCurrentStep(ConversationStep.CONFIRMATION);
        } else {
          // Always use the webhook's message field for invalid orders
          const errorMessage = validation.message || 'Sorry, I couldn\'t understand your order.';
          addMessage(errorMessage, 'bot');
          addBotMessage(`Here are our available items:\n\n${formatMenuDisplay()}\n\nPlease try ordering again.`, 500);
        }
        break;

      case ConversationStep.CONFIRMATION:
        if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('confirm')) {
          if (currentOrderId) {
            setIsTyping(true);
            const confirmationResult = await confirmOrder(currentOrderId, 'yes');
            setIsTyping(false);
            
            addBotMessage(`Wonderful! 🎉 Your order has been confirmed. You'll receive an email at ${customerDetails.email} shortly with the details. Thank you for choosing us! 🙌`);
            setCurrentStep(ConversationStep.COMPLETE);
            toast({
              title: "Order Confirmed! 🎉",
              description: "Your order has been successfully placed.",
            });
          }
        } else if (input.toLowerCase().includes('no')) {
          if (currentOrderId) {
            setIsTyping(true);
            const confirmationResult = await confirmOrder(currentOrderId, 'no');
            setIsTyping(false);
          }
          addBotMessage('No problem! What would you like to order instead?');
          setCurrentStep(ConversationStep.ORDER);
        } else {
          addBotMessage('Please reply with "Yes" to confirm or "No" to cancel your order.');
        }
        break;

      case ConversationStep.COMPLETE:
        addBotMessage('Your order is already confirmed! If you need to place another order, please refresh the page.');
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleUserInput(inputValue.trim());
    }
  };

  useEffect(() => {
    // Initial greeting
    addBotMessage("Hi 👋 I'm Orderly, your smart order assistant. I'll help you place your order quickly and correctly. Can I have your name, please?", 500);
    setCurrentStep(ConversationStep.NAME);
  }, []);

  useEffect(() => {
    // Smooth auto-scroll like WhatsApp
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat messages area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-280px)] p-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} fade-in`}
              >
                <Card
                  className={`chat-bubble max-w-[85%] p-5 ${
                    message.sender === 'user'
                      ? 'chat-bubble-user'
                      : 'chat-bubble-bot'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 rounded-full bg-white/10">
                      {message.sender === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
                      {message.text}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start fade-in">
                <Card className="chat-bubble chat-bubble-bot p-5 max-w-[85%] pulse-glow">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="typing-indicator text-sm font-medium">
                      Orderly is preparing your response... 🍴
                    </div>
                  </div>
                </Card>
              </div>
            )}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Fixed chat input at bottom */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-4">
        <div className="chat-input-container">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tell me what you'd like to order... 🍽️"
                  className="text-base py-4 pl-6 pr-16 border-2 border-primary/20 focus:border-primary rounded-2xl bg-white/95 backdrop-blur-sm"
                  disabled={isTyping || currentStep === ConversationStep.COMPLETE}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">
                  🍴
                </div>
              </div>
              <Button 
                type="submit" 
                size="lg"
                className="rounded-2xl px-6 py-4 bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                disabled={!inputValue.trim() || isTyping || currentStep === ConversationStep.COMPLETE}
              >
                <Send className="w-5 h-5 mr-2" />
                Send
              </Button>
            </div>
          </form>
          
          {/* Status indicator */}
          <div className="mt-3 text-center">
            <span className="text-xs text-muted-foreground bg-white/80 px-3 py-1 rounded-full">
              {currentStep === ConversationStep.COMPLETE ? (
                <>🎉 Order Complete! Thank you!</>
              ) : isTyping ? (
                <>🤖 Orderly is thinking...</>
              ) : (
                <>💬 Ready to take your order</>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};