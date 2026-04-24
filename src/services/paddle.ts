
declare global {
  interface Window {
    Paddle: any;
  }
}

export const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';
export const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || 'sandbox';

export const initializePaddle = () => {
  if (window.Paddle && PADDLE_CLIENT_TOKEN) {
    window.Paddle.Environment.set(PADDLE_ENV);
    window.Paddle.Initialize({ 
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event: any) => {
        console.log('Paddle Global Event:', event.name, event);
        
        // Dispatch custom events so other components can listen
        const customEvent = new CustomEvent('paddle:' + event.name, { detail: event });
        window.dispatchEvent(customEvent);
      }
    });
  }
};

interface CheckoutOptions {
  priceId?: string;
  subscriptionId?: string;
  customerId?: string;
  userId?: string;
  userEmail?: string;
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

export const openPaddleCheckout = ({ priceId, subscriptionId, customerId, userId, userEmail, onSuccess, onClose }: CheckoutOptions) => {
  if (!window.Paddle) {
    console.error('Paddle.js not loaded');
    return;
  }

  // Ensure initialized
  initializePaddle();

  // Listen for the custom events we dispatch in initializePaddle
  const handleSuccess = (e: any) => {
    console.log('Detected: checkout.completed via Global Listener');
    if (onSuccess) onSuccess(e.detail.data);
    cleanup();
  };

  const handleClose = () => {
    console.log('Detected: checkout.closed via Global Listener');
    if (onClose) onClose();
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('paddle:checkout.completed', handleSuccess);
    window.removeEventListener('paddle:checkout.closed', handleClose);
  };

  window.addEventListener('paddle:checkout.completed', handleSuccess);
  window.addEventListener('paddle:checkout.closed', handleClose);

  const checkoutConfig: any = {
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'en',
    },
    customData: {
      userId: userId,
    }
  };

  if (subscriptionId) {
    checkoutConfig.subscriptionId = subscriptionId;
  } else if (customerId) {
    checkoutConfig.customer = { id: customerId };
  } else if (priceId) {
    checkoutConfig.items = [{ priceId, quantity: 1 }];
    checkoutConfig.customer = { email: userEmail };
  }

  window.Paddle.Checkout.open(checkoutConfig);
};

export const closePaddleCheckout = () => {
  if (window.Paddle) {
    window.Paddle.Checkout.close();
  }
};
