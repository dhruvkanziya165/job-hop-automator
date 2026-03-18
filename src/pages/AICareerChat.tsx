import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Send, Loader2, Bot, User as UserIcon, Brain, 
  Sparkles, MessageSquare, Lightbulb, Trash2 
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const suggestedPrompts = [
  "What skills should I learn next?",
  "Suggest internships for my profile",
  "How can I improve my resume?",
  "What projects should I build?",
  "Analyze my application strategy",
  "Help me prepare for interviews",
];

const AICareerChat = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMemory, setHasMemory] = useState(false);
  const [memoriesUsed, setMemoriesUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      
      // Load recent conversation history
      const { data: memories } = await supabase
        .from("chat_memories")
        .select("role, content, created_at")
        .eq("user_id", session.user.id)
        .eq("memory_type", "conversation")
        .order("created_at", { ascending: true })
        .limit(20);

      if (memories?.length) {
        setMessages(memories.map(m => ({ 
          role: m.role as "user" | "assistant", 
          content: m.content 
        })));
        setHasMemory(true);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || sending) return;

    const userMsg: ChatMessage = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("career-chat", {
        body: { 
          message: messageText,
          conversationHistory: messages.slice(-10),
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const assistantMsg: ChatMessage = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, assistantMsg]);
      setHasMemory(data.hasMemory);
      setMemoriesUsed(data.memoriesUsed);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to get response. Please try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (!user || !confirm("Clear all conversation history?")) return;
    await supabase
      .from("chat_memories")
      .delete()
      .eq("user_id", user.id)
      .eq("memory_type", "conversation");
    setMessages([]);
    toast.success("Conversation cleared");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              CareerPilot AI
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your AI career advisor that learns and improves over time
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasMemory && (
              <Badge variant="outline" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                {memoriesUsed} memories active
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Hi! I'm CareerPilot AI</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-md">
                  I remember our conversations and learn about your career goals. 
                  The more we chat, the better my advice gets!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                  {suggestedPrompts.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 px-3 text-left justify-start"
                      onClick={() => sendMessage(prompt)}
                    >
                      <Lightbulb className="h-3 w-3 mr-2 shrink-0 text-primary" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about your career, skills, resume..."
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AICareerChat;
