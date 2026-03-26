import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function useOpfsQuotaListener() {
  useEffect(() => {
    const handleQuotaExceeded = (event: CustomEvent<{ message: string }>) => {
      toast({
        title: "Storage Warning",
        description: event.detail?.message || "Local storage full. Older archives may need to be cleared.",
        variant: "destructive",
      });
    };

    window.addEventListener('engine:storage:quota-exceeded', handleQuotaExceeded as EventListener);

    return () => {
      window.removeEventListener('engine:storage:quota-exceeded', handleQuotaExceeded as EventListener);
    };
  }, []);
}
