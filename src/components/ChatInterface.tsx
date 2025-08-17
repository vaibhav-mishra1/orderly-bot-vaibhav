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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
      const response = await fetch('https://arcadebunny.app.n8n.cloud/webhook-test/b9d3b678-595a-4d83-9e6e-57d935a20d4d', {
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
          message: orderResponse.customerMessage || 'Sorry, I couldn\'t understand your order.'
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
          addMessage(formatOrderConfirmation(validation.orderDetails, validation.orderId), 'bot');
          addBotMessage('Would you like to confirm this order? (Reply "yes" to confirm)', 500);
          setCurrentStep(ConversationStep.CONFIRMATION);
        } else {
          const errorMessage = validation.message || 'Sorry, I couldn\'t understand your order. Please try again with items from our menu.';
          addMessage(errorMessage, 'bot');
          addBotMessage(`Here are our available items:\n\n${formatMenuDisplay()}\n\nPlease try ordering again.`, 500);
        }
        break;

      case ConversationStep.CONFIRMATION:
        if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('confirm')) {
          addBotMessage(`Wonderful! 🎉 Your order has been confirmed. You'll receive an email at ${customerDetails.email} shortly with the details. Thank you for choosing us! 🙌`);
          setCurrentStep(ConversationStep.COMPLETE);
          toast({
            title: "Order Confirmed! 🎉",
            description: "Your order has been successfully placed.",
          });
        } else {
          addBotMessage('No problem! What would you like to order instead?');
          setCurrentStep(ConversationStep.ORDER);
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
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <ScrollArea className="flex-1 p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} fade-in`}
          >
            <Card
              className={`chat-bubble max-w-[80%] p-4 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {message.sender === 'user' ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.text}
                </div>
              </div>
            </Card>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start fade-in">
            <Card className="chat-bubble bg-card text-card-foreground p-4 max-w-[80%]">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 flex-shrink-0" />
                <div className="typing-indicator text-sm text-muted-foreground">
                  Orderly is typing...
                </div>
              </div>
            </Card>
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isTyping || currentStep === ConversationStep.COMPLETE}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!inputValue.trim() || isTyping || currentStep === ConversationStep.COMPLETE}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};