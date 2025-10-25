import { useState, useEffect } from 'react';
import { PersistentHeader } from '@/components/PersistentHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, GraduationCap, BookOpen, MessageSquare, Settings, 
  Megaphone, Bot, Users, Code, TrendingUp, AlertCircle,
  Clock, Star, PlayCircle, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrainingContent {
  id: string;
  category: string;
  feature_name: string;
  title: string;
  description: string;
  content_type: string;
  difficulty: string;
  estimated_time: string;
  tags: string[];
  video_url?: string;
}

const categoryIcons: Record<string, any> = {
  channels: MessageSquare,
  marketing: Megaphone,
  ai: Bot,
  team: Users,
  conversations: MessageSquare,
  settings: Settings,
  api: Code,
  troubleshooting: AlertCircle,
};

const categoryColors: Record<string, string> = {
  channels: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  marketing: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  ai: 'bg-green-500/10 text-green-700 dark:text-green-300',
  team: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  conversations: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  settings: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
  api: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  troubleshooting: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function Training() {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [filteredContent, setFilteredContent] = useState<TrainingContent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    filterContent();
  }, [searchQuery, selectedCategory, content]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('training_content')
        .select('*')
        .eq('is_published', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setContent(data || []);
    } catch (error: any) {
      console.error('Failed to fetch training content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load training content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContent = () => {
    let filtered = content;

    if (selectedCategory) {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredContent(filtered);
  };

  const categories = Array.from(new Set(content.map(c => c.category)));
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = content.filter(c => c.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const popularContent = content.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <PersistentHeader />
      
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Training Center</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master every feature of À La Carte Chat with our comprehensive guides and tutorials
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ask anything about À La Carte Chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    const event = new CustomEvent('open-training-assistant', { 
                      detail: { question: searchQuery.trim() } 
                    });
                    window.dispatchEvent(event);
                  }
                }}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button 
              size="lg"
              className="h-12 gap-2"
              onClick={() => {
                const event = new CustomEvent('open-training-assistant', { 
                  detail: { question: searchQuery.trim() } 
                });
                window.dispatchEvent(event);
              }}
              disabled={!searchQuery.trim()}
            >
              <Bot className="h-5 w-5" />
              Ask AI
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Guides</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>

          {/* All Guides */}
          <TabsContent value="all" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading training content...</p>
              </div>
            ) : filteredContent.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No guides found matching your search.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredContent.map((item) => {
                  const Icon = categoryIcons[item.category] || BookOpen;
                  const colorClass = categoryColors[item.category] || 'bg-gray-500/10';
                  
                  return (
                    <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {item.video_url && (
                            <Badge variant="secondary" className="gap-1">
                              <PlayCircle className="h-3 w-3" />
                              Video
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {item.difficulty}
                          </Badge>
                          {item.estimated_time && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {item.estimated_time}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Popular */}
          <TabsContent value="popular">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {popularContent.map((item) => {
                const Icon = categoryIcons[item.category] || BookOpen;
                const colorClass = categoryColors[item.category] || 'bg-gray-500/10';
                
                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="default" className="gap-1">
                          <Star className="h-3 w-3" />
                          Popular
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.difficulty}
                        </Badge>
                        {item.estimated_time && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            {item.estimated_time}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories" className="space-y-6">
            {categories.map((category) => {
              const Icon = categoryIcons[category] || BookOpen;
              const colorClass = categoryColors[category] || 'bg-gray-500/10';
              const categoryContent = content.filter(c => c.category === category);

              return (
                <Card key={category}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="capitalize">{category}</CardTitle>
                        <CardDescription>
                          {categoryCounts[category]} guides available
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {categoryContent.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {item.difficulty}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
