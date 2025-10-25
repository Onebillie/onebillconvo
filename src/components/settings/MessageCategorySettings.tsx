import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MessageCategory {
  id: string;
  category_name: string;
  display_name: string;
  background_color: string;
  text_color: string;
  border_color: string;
  icon: string;
  is_default: boolean;
}

export function MessageCategorySettings() {
  const [categories, setCategories] = useState<MessageCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const { toast } = useToast();

  const iconNames = [
    "MessageCircle",
    "Megaphone",
    "FileText",
    "Bot",
    "StickyNote",
    "Bell",
    "AlertCircle",
    "Calendar",
    "ShoppingCart",
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("message_categories")
        .select("*")
        .order("category_name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load message categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (category: MessageCategory) => {
    try {
      const { error } = await supabase
        .from("message_categories")
        .update({
          display_name: category.display_name,
          background_color: category.background_color,
          text_color: category.text_color,
          border_color: category.border_color,
          icon: category.icon,
        })
        .eq("id", category.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setEditing(null);
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Message Categories</h3>
        <p className="text-sm text-muted-foreground">
          Customize how different types of messages appear in conversations
        </p>
      </div>

      <div className="grid gap-4">
        {categories.map((category) => {
          const IconComponent = (Icons as any)[category.icon];
          const isEditing = editing === category.id;

          return (
            <Card key={category.id} className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {IconComponent && <IconComponent className="h-5 w-5" />}
                    <div>
                      <h4 className="font-medium">{category.display_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {category.category_name}
                      </p>
                    </div>
                  </div>
                  {!category.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(isEditing ? null : category.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Preview */}
                <div className="flex items-center gap-4">
                  <div
                    className="px-4 py-2 rounded-lg max-w-sm"
                    style={{
                      backgroundColor: category.background_color,
                      color: category.text_color,
                      borderLeft: `4px solid ${category.border_color}`,
                    }}
                  >
                    Sample message preview
                  </div>
                  <Badge
                    style={{
                      backgroundColor: category.border_color,
                      color: category.text_color,
                    }}
                  >
                    {category.display_name}
                  </Badge>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Display Name</Label>
                        <Input
                          value={category.display_name}
                          onChange={(e) =>
                            setCategories(
                              categories.map((c) =>
                                c.id === category.id
                                  ? { ...c, display_name: e.target.value }
                                  : c
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Icon</Label>
                        <Select
                          value={category.icon}
                          onValueChange={(value) =>
                            setCategories(
                              categories.map((c) =>
                                c.id === category.id ? { ...c, icon: value } : c
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconNames.map((icon) => (
                              <SelectItem key={icon} value={icon}>
                                {icon}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={category.background_color}
                            onChange={(e) =>
                              setCategories(
                                categories.map((c) =>
                                  c.id === category.id
                                    ? { ...c, background_color: e.target.value }
                                    : c
                                )
                              )
                            }
                            className="h-10 w-16"
                          />
                          <Input
                            value={category.background_color}
                            onChange={(e) =>
                              setCategories(
                                categories.map((c) =>
                                  c.id === category.id
                                    ? { ...c, background_color: e.target.value }
                                    : c
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={category.text_color}
                            onChange={(e) =>
                              setCategories(
                                categories.map((c) =>
                                  c.id === category.id
                                    ? { ...c, text_color: e.target.value }
                                    : c
                                )
                              )
                            }
                            className="h-10 w-16"
                          />
                          <Input
                            value={category.text_color}
                            onChange={(e) =>
                              setCategories(
                                categories.map((c) =>
                                  c.id === category.id
                                    ? { ...c, text_color: e.target.value }
                                    : c
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={category.border_color}
                            onChange={(e) =>
                              setCategories(
                                categories.map((c) =>
                                  c.id === category.id
                                    ? { ...c, border_color: e.target.value }
                                    : c
                                )
                              )
                            }
                            className="h-10 w-16"
                          />
                          <Input
                            value={category.border_color}
                            onChange={(e) =>
                              setCategories(
                                categories.map((c) =>
                                  c.id === category.id
                                    ? { ...c, border_color: e.target.value }
                                    : c
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdate(category)}>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
