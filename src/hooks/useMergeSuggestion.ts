import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatIrishPhone } from '@/lib/phoneUtils';

interface Customer {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  alternate_emails?: string[] | null;
  phone?: string | null;
}

interface MergeSuggestion {
  customer: Customer;
  matchScore: number;
  matchReasons: string[];
}

export const useMergeSuggestion = (selectedCustomer: Customer | null) => {
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCustomer) {
      setSuggestions([]);
      return;
    }

    const checkForDuplicates = async () => {
      setLoading(true);
      try {
        // Fetch all customers except the selected one
        const { data: allCustomers, error } = await supabase
          .from('customers')
          .select('id, name, first_name, last_name, email, alternate_emails, phone')
          .neq('id', selectedCustomer.id);

        if (error || !allCustomers) {
          console.error('Error fetching customers:', error);
          setLoading(false);
          return;
        }

        const matches: MergeSuggestion[] = [];

        // Normalize the selected customer's data
        const selectedEmail = selectedCustomer.email?.toLowerCase().trim();
        const selectedAlternateEmails = (selectedCustomer.alternate_emails || [])
          .map(e => e.toLowerCase().trim());
        const selectedPhone = selectedCustomer.phone ? formatIrishPhone(selectedCustomer.phone) : '';
        const selectedFirstName = (selectedCustomer.first_name || selectedCustomer.name.split(' ')[0] || '')
          .toLowerCase().trim();
        const selectedLastName = (selectedCustomer.last_name || selectedCustomer.name.split(' ').slice(1).join(' ') || '')
          .toLowerCase().trim();

        for (const customer of allCustomers) {
          let score = 0;
          const matchReasons: string[] = [];

          // Check email match (exact or in alternate emails)
          const customerEmail = customer.email?.toLowerCase().trim();
          const customerAlternateEmails = (customer.alternate_emails || [])
            .map(e => e.toLowerCase().trim());
          
          if (customerEmail && selectedEmail && customerEmail === selectedEmail) {
            score++;
            matchReasons.push(`Email: ${customerEmail}`);
          } else if (customerEmail && selectedAlternateEmails.includes(customerEmail)) {
            score++;
            matchReasons.push(`Email in alternates: ${customerEmail}`);
          } else if (selectedEmail && customerAlternateEmails.includes(selectedEmail)) {
            score++;
            matchReasons.push(`Alternate email: ${selectedEmail}`);
          }

          // Check phone match (normalized)
          const customerPhone = customer.phone ? formatIrishPhone(customer.phone) : '';
          if (customerPhone && selectedPhone && customerPhone === selectedPhone) {
            score++;
            matchReasons.push(`Phone: ${customer.phone}`);
          }

          // Check first name match (case-insensitive token match)
          const customerFirstName = (customer.first_name || customer.name.split(' ')[0] || '')
            .toLowerCase().trim();
          if (customerFirstName && selectedFirstName && customerFirstName === selectedFirstName) {
            score++;
            matchReasons.push(`First name: ${customerFirstName}`);
          }

          // Check last name match (case-insensitive token match)
          const customerLastName = (customer.last_name || customer.name.split(' ').slice(1).join(' ') || '')
            .toLowerCase().trim();
          if (customerLastName && selectedLastName && customerLastName === selectedLastName) {
            score++;
            matchReasons.push(`Last name: ${customerLastName}`);
          }

          // If 3 or more fields match, add to suggestions
          if (score >= 3) {
            matches.push({
              customer,
              matchScore: score,
              matchReasons,
            });
          }
        }

        // Sort by match score (highest first)
        matches.sort((a, b) => b.matchScore - a.matchScore);

        setSuggestions(matches);
      } catch (error) {
        console.error('Error checking for duplicates:', error);
      } finally {
        setLoading(false);
      }
    };

    checkForDuplicates();
  }, [selectedCustomer]);

  return { suggestions, loading };
};
