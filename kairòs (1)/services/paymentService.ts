
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './firebase';

// Sostituisci con la tua CHIAVE PUBBLICA Stripe (inizia con pk_test_ o pk_live_)
// Puoi trovarla nella Dashboard Stripe -> Developers -> API Keys
const STRIPE_PUBLIC_KEY = "pk_test_TYooMQauvdEDq54NiTphI7jx"; 

// ID del Prezzo "Kairòs Pro" (€2.99)
// Copiato dalla Dashboard Stripe (Prodotti -> Kairòs Pro -> Tariffe -> API ID)
const STRIPE_PRICE_ID = "price_1SlJY4LqGpZPqygRhkxjEZFk";

let stripePromise: any = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

export const initiateCheckout = async (userId: string, userEmail: string) => {
  console.log(`[Payment] Avvio checkout per User: ${userId} con PriceID: ${STRIPE_PRICE_ID}`);
  
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe non caricato correttamente.");

  if (!supabase) {
      throw new Error("Supabase non configurato. Impossibile avviare il checkout cloud.");
  }

  // Chiamata alla Supabase Edge Function 'create-checkout-session'
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { 
        userId, 
        email: userEmail,
        priceId: STRIPE_PRICE_ID, // ID Prezzo specifico inserito
        returnUrl: window.location.origin // Dove tornare dopo il pagamento
    },
  });

  if (error) {
      console.error("Errore Backend Pagamenti:", error);
      throw new Error("Errore comunicazione Server: " + (error.message || error));
  }

  if (!data?.sessionId) {
      console.error("Risposta Server non valida:", data);
      throw new Error("Session ID mancante dalla risposta del server.");
  }

  console.log("[Payment] Sessione creata, reindirizzamento a Stripe...");

  // Reindirizza alla pagina di pagamento sicura di Stripe
  const { error: stripeError } = await stripe.redirectToCheckout({
    sessionId: data.sessionId,
  });

  if (stripeError) {
    throw stripeError;
  }
};

export const checkSubscriptionStatus = async (userId: string) => {
    if (!supabase) return false;
    
    // Controlla se l'utente ha un abbonamento attivo nel DB
    const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single();
    
    if (error || !data) return false;
    return true;
};
