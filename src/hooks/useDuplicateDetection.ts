import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DuplicateGroup {
  customers: any[];
  conversations: any[];
  matchType: "email" | "phone";
  matchValue: string;
}

export const useDuplicateDetection = () => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectDuplicates();
  }, []);

  const detectDuplicates = async () => {
    try {
      // Fetch all customers
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;
      if (!customers) return;

      // Group customers by email and phone
      const emailGroups = new Map<string, any[]>();
      const phoneGroups = new Map<string, any[]>();

      customers.forEach((customer) => {
        // Group by email
        if (customer.email) {
          const email = customer.email.toLowerCase();
          if (!emailGroups.has(email)) {
            emailGroups.set(email, []);
          }
          emailGroups.get(email)!.push(customer);
        }

        // Check alternate emails
        if (customer.alternate_emails) {
          customer.alternate_emails.forEach((altEmail: string) => {
            const email = altEmail.toLowerCase();
            if (!emailGroups.has(email)) {
              emailGroups.set(email, []);
            }
            emailGroups.get(email)!.push(customer);
          });
        }

        // Group by phone
        if (customer.phone) {
          if (!phoneGroups.has(customer.phone)) {
            phoneGroups.set(customer.phone, []);
          }
          phoneGroups.get(customer.phone)!.push(customer);
        }
      });

      // Find groups with duplicates
      const duplicateGroups: DuplicateGroup[] = [];

      // Check email duplicates
      emailGroups.forEach((group, email) => {
        if (group.length > 1) {
          // Get unique customers (by ID)
          const uniqueCustomers = Array.from(
            new Map(group.map((c) => [c.id, c])).values()
          );

          if (uniqueCustomers.length > 1) {
            // Fetch conversations for these customers
            const customerIds = uniqueCustomers.map((c) => c.id);
            
            supabase
              .from("conversations")
              .select("*")
              .in("customer_id", customerIds)
              .then(({ data: conversations }) => {
                if (conversations && conversations.length > 0) {
                  duplicateGroups.push({
                    customers: uniqueCustomers,
                    conversations: conversations || [],
                    matchType: "email",
                    matchValue: email,
                  });
                }
              });
          }
        }
      });

      // Check phone duplicates (excluding already found email duplicates)
      phoneGroups.forEach((group, phone) => {
        if (group.length > 1 && phone) {
          const uniqueCustomers = Array.from(
            new Map(group.map((c) => [c.id, c])).values()
          );

          if (uniqueCustomers.length > 1) {
            // Check if this group was already added via email match
            const alreadyAdded = duplicateGroups.some((dup) =>
              dup.customers.some((c) =>
                uniqueCustomers.some((uc) => uc.id === c.id)
              )
            );

            if (!alreadyAdded) {
              const customerIds = uniqueCustomers.map((c) => c.id);
              
              supabase
                .from("conversations")
                .select("*")
                .in("customer_id", customerIds)
                .then(({ data: conversations }) => {
                  if (conversations && conversations.length > 0) {
                    duplicateGroups.push({
                      customers: uniqueCustomers,
                      conversations: conversations || [],
                      matchType: "phone",
                      matchValue: phone,
                    });
                  }
                });
            }
          }
        }
      });

      // Wait a bit for the async conversation fetches to complete
      setTimeout(() => {
        setDuplicates(duplicateGroups);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error detecting duplicates:", error);
      setLoading(false);
    }
  };

  return { duplicates, loading, refresh: detectDuplicates };
};