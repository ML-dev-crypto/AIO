/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ShoppingBag, 
  Menu, 
  X, 
  ChevronRight, 
  Music, 
  CheckCircle2,
  Guitar,
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Instagram,
  Twitter,
  Facebook,
  User,
  LogOut,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import supabase from './lib/supabase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';

// --- UTILS ---
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');
const PRODUCT_IMAGE_FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="%230a0a0a"/><text x="50%" y="48%" fill="%23ffffff" opacity="0.55" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700">AIO</text><text x="50%" y="54%" fill="%23ffffff" opacity="0.35" text-anchor="middle" font-family="Arial, sans-serif" font-size="24">Image unavailable</text></svg>';
const handleProductImageError: React.ReactEventHandler<HTMLImageElement> = (event) => {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = PRODUCT_IMAGE_FALLBACK;
};
const toNumericPrice = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
};
const toDisplayPrice = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return `$${value.toLocaleString()}`;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('$')) return trimmed;
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) return `$${numeric.toLocaleString()}`;
    return value;
  }
  return '$0';
};

const SmartImage = ({
  src,
  alt,
  className,
  type = 'photo',
}: {
  src: string;
  alt: string;
  className: string;
  type?: 'photo' | 'guitar';
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`${className} bg-zinc-900 flex flex-col items-center justify-center p-12 border border-white/5`}>
        {type === 'guitar' ? (
          <Guitar className="w-16 h-16 text-white/10 mb-4 animate-pulse" strokeWidth={1} />
        ) : (
          <Music className="w-16 h-16 text-white/10 mb-4 animate-pulse" strokeWidth={1} />
        )}
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20">Signature Asset</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${className} bg-zinc-900`}
      referrerPolicy="no-referrer"
    />
  );
};

type CartItem = {
  id: string;
  product_id?: number | string;
  user_id?: string;
  name: string;
  price: string | number;
  image: string;
  category: string;
  quantity: number;
};

type ShippingDetails = {
  fullName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
};

type ProductLike = {
  id?: number | string;
  product_id?: number | string;
  name: string;
  price: string | number;
  image: string;
  category?: string;
  cat?: string;
};

const normalizeProductId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9]/g, ''));
    return Number.isNaN(numeric) ? null : numeric;
  }
  return null;
};

// --- CONSTANTS ---
const WORDS = ["ALL", "IN", "ONE", "GUITAR", "SHOP"];

const FILTERS = ["All", "Electric", "Acoustic", "Bass", "Vintage", "Classical"];

const Navbar = ({ 
  onNav, 
  user, 
  onLogin, 
  onLogout, 
  cartCount, 
  onOpenCart,
  isLoggingIn
}: { 
  onNav: (page: string) => void, 
  user: FirebaseUser | null, 
  onLogin: () => void, 
  onLogout: () => void,
  cartCount: number,
  onOpenCart: () => void,
  isLoggingIn: boolean
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
    { label: 'Instruments', page: 'instruments' },
    { label: 'Custom Shop', page: 'custom' },
    { label: 'Artist Series', page: 'artists' },
    { label: 'About', page: 'about' },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  const handleNavigate = (targetPage: string) => {
    onNav(targetPage);
    setIsMobileMenuOpen(false);
  };

  const handleOpenCart = () => {
    onOpenCart();
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => {
    onLogin();
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-500 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between",
        scrolled ? "bg-black/80 backdrop-blur-lg border-b border-white/10" : "bg-transparent"
      )}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate('home')}>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold tracking-widest text-white text-lg sm:text-xl">AIO.</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-white/70">
          {navItems.map((item) => (
            <button key={item.page} onClick={() => handleNavigate(item.page)} className="hover:text-white transition-colors cursor-pointer">
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={handleOpenCart}
            className="text-white hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => handleNavigate('profile')}
                className="hidden md:block text-right group cursor-pointer"
              >
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none group-hover:text-white/60 transition-colors">Welcome</p>
                <p className="text-xs font-bold text-white tracking-tight group-hover:text-white/80 transition-colors">{user.displayName?.split(' ')[0]}</p>
              </button>
              <button 
                onClick={handleLogout}
                className="text-white/40 hover:text-white p-2 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white">
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </span>
            </button>
          )}

          <button
            className="md:hidden text-white cursor-pointer p-1"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              aria-label="Close mobile menu overlay"
            />
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed top-[68px] left-0 right-0 bottom-0 z-40 bg-[#050505] border-t border-white/10 px-5 py-6 overflow-y-auto"
            >
              <div className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.page}
                    onClick={() => handleNavigate(item.page)}
                    className="w-full text-left px-4 py-3 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-[0.2em] text-white/80 hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}

                {user && (
                  <button
                    onClick={() => handleNavigate('profile')}
                    className="w-full text-left px-4 py-3 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-[0.2em] text-white/80 hover:bg-white/5 transition-colors"
                  >
                    Profile
                  </button>
                )}
              </div>

              <div className="mt-8 border-t border-white/10 pt-6 space-y-3">
                <button
                  onClick={handleOpenCart}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>Bag</span>
                  <span>{cartCount}</span>
                </button>

                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 bg-white text-black rounded-xl text-sm font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                  >
                    Logout <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full px-4 py-3 bg-white text-black rounded-xl text-sm font-bold uppercase tracking-[0.2em] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? 'Logging in...' : 'Login with Google'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const Hero = () => {
  const [isActive, setIsActive] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [gsapReady, setGsapReady] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const stringsRef = useRef<(HTMLDivElement | null)[]>([]);
  const guitarRef = useRef<HTMLImageElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load GSAP from CDN to avoid module resolution issues
  useEffect(() => {
    // @ts-ignore
    if (window.gsap) {
      setGsapReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
    script.async = true;
    script.onload = () => setGsapReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    // @ts-ignore
    if (!gsapReady || !window.gsap) return;
    
    // @ts-ignore
    const gsap = window.gsap;

    // Initial Setup
    gsap.set(guitarRef.current, {
      xPercent: -50, yPercent: -50,
      opacity: 0, scale: 0.88, x: 0, y: 0, rotateY: 0,
      filter: 'blur(10px) brightness(0.7) contrast(1.1)',
    });
    gsap.set(stringsRef.current, { opacity: 0 });
    gsap.set(buttonRef.current, { scale: 0, opacity: 0, rotate: 0 });
    gsap.set(wordsRef.current, { y: -120, opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsIntroComplete(true);
        gsap.to(buttonRef.current, { rotate: '+=360', duration: 12, repeat: -1, ease: 'linear' });
        gsap.to(guitarRef.current, { y: '-8px', duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      },
    });

    // Sequence
    tl.to(guitarRef.current, {
      opacity: 0.62, scale: 0.95,
      filter: 'blur(0px) brightness(0.8) contrast(1.1)',
      duration: 1.2, ease: 'power3.out',
    });

    WORDS.forEach((word, i) => {
      tl.to(wordsRef.current[i], { 
        y: 0, 
        opacity: 1, 
        duration: 0.7, 
        ease: 'power4.out' 
      }, '>-0.1');

      if (word === 'ONE') {
        tl.to(buttonRef.current, { 
          scale: 1, 
          opacity: 1, 
          duration: 0.8, 
          ease: 'back.out(1.7)' 
        }, '<');
      }

      if (i >= 2) {
        tl.to(buttonRef.current, { 
          rotate: '+=15', 
          scale: 1.1, 
          duration: 0.2, 
          yoyo: true, 
          repeat: 1, 
          ease: 'sine.inOut' 
        }, '<');
      }
    });
  }, [gsapReady]);

  const handleTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    // @ts-ignore
    if (isActive || !isIntroComplete || !window.gsap) return;
    setIsActive(true);
    
    // @ts-ignore
    const gsap = window.gsap;
    gsap.killTweensOf(guitarRef.current);
    gsap.killTweensOf(buttonRef.current);

    const tl = gsap.timeline();
    tl.to(buttonRef.current, { 
      scale: 0, 
      opacity: 0, 
      duration: 0.3, 
      ease: 'power2.in' 
    });
    
    tl.to('.hero-text-container', { 
      x: '-15vw', 
      scale: 0.9, 
      opacity: 0.7, 
      filter: 'blur(1px)', 
      duration: 1.5, 
      ease: 'power3.inOut' 
    }, '<');
    
    tl.to(guitarRef.current, { 
      x: '15vw', 
      y: '-2vh', 
      scale: 1.1, 
      opacity: 1, 
      rotateY: 10, 
      filter: 'brightness(1) contrast(1.2)', 
      duration: 1.5, 
      ease: 'power3.inOut' 
    }, '<');
    
    tl.to(stringsRef.current, { 
      opacity: 0.2, 
      duration: 1, 
      stagger: 0.1 
    }, '<');
    
    tl.to(stringsRef.current, { 
      x: (i: number) => (i % 2 === 0 ? 8 : -8), 
      duration: 0.1, 
      repeat: 7, 
      yoyo: true, 
      stagger: 0.05, 
      ease: 'sine.inOut' 
    }, '-=1.2');
    
    tl.to('.scroll-indicator', { 
      opacity: 1, 
      y: 0, 
      duration: 1.2, 
      ease: 'power3.out' 
    }, '-=0.5');
  };

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-[#050505] flex items-center justify-center"
      style={{ perspective: '1200px' }}
    >
      {/* Background Strings */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            ref={el => (stringsRef.current[i] = el)}
            className="absolute top-0 bottom-0 w-[1px]"
            style={{ 
              left: `${15 + i * 14}%`, 
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)',
              opacity: 0
            }}
          />
        ))}
      </div>

      {/* Main Guitar Image */}
      <img 
        ref={guitarRef}
        src="https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=1974&auto=format&fit=crop"
        alt="Premium Electric Guitar"
        className="absolute z-[5] pointer-events-none object-contain"
        referrerPolicy="no-referrer"
        style={{ 
          left: '50%', 
          top: '50%', 
          height: '85vh', 
          width: 'auto', 
          maxWidth: 'none',
          filter: 'drop-shadow(0 60px 100px rgba(0,0,0,0.9))'
        }}
      />

      {/* Cinematic Vignette */}
      <div className="absolute inset-0 z-[6] pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.6) 70%, #050505 100%)' }}
      />

      {/* Text Content */}
      <div className="container mx-auto px-6 relative z-[20] h-full flex items-center justify-center hero-text-container">
        <div className="w-full flex items-center justify-center text-center">
          <div className="flex flex-col items-center" style={{ lineHeight: 0.85, letterSpacing: '-0.04em' }}>
            {WORDS.map((word, i) => (
              <span 
                key={word + i} 
                ref={el => (wordsRef.current[i] = el)}
                className="font-black tracking-tighter text-white inline-block relative z-[20]"
                style={{ fontSize: 'clamp(3.5rem, 14vh, 18vh)' }}
              >
                {word === 'ONE' ? (
                  <span className="relative inline-block">
                    {word}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[30]"
                      style={{ transform: 'translateY(12%)' }}>
                      <button 
                        ref={buttonRef} 
                        onClick={handleTrigger} 
                        disabled={!isIntroComplete}
                        className={cn(
                          'pointer-events-auto rounded-full flex items-center justify-center transition-all duration-300',
                          'w-[64px] h-[64px] backdrop-blur-3xl border border-white/20',
                          'shadow-[0_0_40px_rgba(255,255,255,0.1)]',
                          isIntroComplete ? 'hover:scale-110 hover:shadow-white/20 cursor-pointer' : 'cursor-default opacity-50'
                        )}
                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <Play className="w-5 h-5 text-white fill-white ml-1" />
                      </button>
                    </div>
                  </span>
                ) : word}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Interaction Hint */}
      <div className="scroll-indicator absolute bottom-12 left-1/2 flex flex-col items-center gap-3 z-30"
        style={{ transform: 'translateX(-50%) translateY(20px)', opacity: 0 }}>
        <span className="uppercase text-[10px] tracking-[0.4em] text-white/40 font-bold">
          Initiate Core Experience
        </span>
        <div className="w-px h-16 bg-gradient-to-b from-white/40 to-transparent" />
      </div>
    </section>
  );
};

const ProductCard: React.FC<{ product: any, onAddToCart: () => void, onClick: () => void }> = ({ product, onAddToCart, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    whileHover={{ y: -10 }}
    className="group relative cursor-pointer"
    onClick={onClick}
  >
    <div className="aspect-[3/4] overflow-hidden bg-[#111] rounded-2xl relative">
      <img 
        src={product.image} 
        alt={product.name} 
        referrerPolicy="no-referrer"
        onError={handleProductImageError}
        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-6 left-6 right-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
        <button 
          onClick={onAddToCart}
          className="w-full bg-white text-black py-3 rounded-full font-bold flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          Add to Bag <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
    <div className="mt-6 flex justify-between items-start">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{product.category}</p>
        <h3 className="text-xl font-bold text-white">{product.name}</h3>
      </div>
      <p className="text-lg font-light text-white/60 italic">{product.price}</p>
    </div>
  </motion.div>
);

const Cart = ({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove, 
  onCheckout 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  items: CartItem[], 
  onUpdateQuantity: (itemId: string, delta: number) => void, 
  onRemove: (itemId: string) => void,
  onCheckout: (details: ShippingDetails) => void
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: ''
  });

  const total = items.reduce((acc, item) => {
    return acc + (toNumericPrice(item.price) * item.quantity);
  }, 0);

  const resetAndClose = () => {
    setIsCheckingOut(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/10 z-[101] flex flex-col"
          >
            <div className="p-5 sm:p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">
                  {isCheckingOut ? 'Shipping Details.' : 'Your Bag.'}
                </h2>
                <p className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase mt-1">
                  {isCheckingOut ? 'Secure Checkout' : `${items.length} ${items.length === 1 ? 'Item' : 'Items'}`}
                </p>
              </div>
              <button onClick={resetAndClose} className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              {!isCheckingOut ? (
                <div className="space-y-8">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                      <ShoppingBag className="w-16 h-16 mb-6" />
                      <p className="text-xs font-bold tracking-widest uppercase">Your bag is empty</p>
                    </div>
                  ) : (
                    items.map((item) => {
                      const itemId = String(item.id);
                      return (
                      <div key={itemId} className="flex gap-6 group">
                        <div className="w-24 h-32 bg-[#111] rounded-lg overflow-hidden flex-shrink-0">
                          <img src={item.image} alt={item.name} onError={handleProductImageError} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="text-sm font-bold tracking-tight">{item.name}</h3>
                              <button 
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onRemove(itemId);
                                }}
                                className="text-white/20 hover:text-red-500 transition-colors cursor-pointer"
                                aria-label={`Remove ${item.name} from bag`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mt-1">{item.category}</p>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 bg-white/5 rounded-full px-3 py-1 border border-white/5">
                              <button 
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onUpdateQuantity(itemId, -1);
                                }}
                                className="p-1 hover:text-white text-white/40 transition-colors cursor-pointer"
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button 
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onUpdateQuantity(itemId, 1);
                                }}
                                className="p-1 hover:text-white text-white/40 transition-colors cursor-pointer"
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm font-bold italic">{item.price}</p>
                          </div>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-white/30 uppercase">Full Name</label>
                    <input 
                      type="text" 
                      value={shippingDetails.fullName}
                      onChange={(e) => setShippingDetails({...shippingDetails, fullName: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-white/30 uppercase">Shipping Address</label>
                    <input 
                      type="text" 
                      value={shippingDetails.address}
                      onChange={(e) => setShippingDetails({...shippingDetails, address: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                      placeholder="123 Guitar Lane"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black tracking-widest text-white/30 uppercase">City</label>
                      <input 
                        type="text" 
                        value={shippingDetails.city}
                        onChange={(e) => setShippingDetails({...shippingDetails, city: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                        placeholder="Nashville"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black tracking-widest text-white/30 uppercase">Zip Code</label>
                      <input 
                        type="text" 
                        value={shippingDetails.zipCode}
                        onChange={(e) => setShippingDetails({...shippingDetails, zipCode: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                        placeholder="37201"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-white/30 uppercase">Phone Number</label>
                    <input 
                      type="tel" 
                      value={shippingDetails.phone}
                      onChange={(e) => setShippingDetails({...shippingDetails, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <button 
                    onClick={() => setIsCheckingOut(false)}
                    className="text-[10px] font-bold tracking-widest text-white/40 hover:text-white transition-colors uppercase flex items-center gap-2"
                  >
                    <ChevronRight className="w-3 h-3 rotate-180" /> Back to Bag
                  </button>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 sm:p-8 bg-white/5 border-t border-white/10 space-y-6">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-bold tracking-[0.4em] text-white/30 uppercase">Total</p>
                  <p className="text-3xl font-black tracking-tighter">${total.toLocaleString()}</p>
                </div>
                
                {!isCheckingOut ? (
                  <button 
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full py-4 bg-white text-black text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white/90 transition-all cursor-pointer"
                  >
                    Checkout Now
                  </button>
                ) : (
                  <button 
                    onClick={() => onCheckout(shippingDetails)}
                    disabled={!shippingDetails.fullName || !shippingDetails.address || !shippingDetails.phone}
                    className="w-full py-4 bg-white text-black text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete Purchase
                  </button>
                )}
                
                <p className="text-center text-[9px] tracking-widest text-white/20 uppercase">
                  {isCheckingOut ? 'Secured by AIO Encryption' : 'Shipping & taxes calculated at checkout'}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const Features = () => (
  <section className="bg-black py-20 md:py-32 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10 md:gap-16">
      {[
        { icon: ShieldCheck, title: "LIFETIME WARRANTY", desc: "Every instrument is a companion for life. We stand by our craft with unyielding support." },
        { icon: Truck, title: "SECURE TRANSPORT", desc: "Custom-fitted vault cases and climate-controlled shipping for every single order." },
        { icon: RotateCcw, title: "30-DAY HARMONY", desc: "Not the right vibration? Return it within 30 days for a full refund, no questions asked." }
      ].map((feature, i) => (
        <div key={i} className="flex flex-col items-center text-center group">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-500">
            <feature.icon className="w-8 h-8" />
          </div>
          <h4 className="text-white text-lg font-bold tracking-widest mb-4">{feature.title}</h4>
          <p className="text-white/40 leading-relaxed font-light">{feature.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

const ProductDetailPage = ({ product, onAddToCart, onBack }: { product: any, onAddToCart: (p: any) => void, onBack: () => void }) => {
  if (!product) return null;

  const specs = product.specifications ? JSON.parse(product.specifications) : {};

  return (
    <section className="bg-[#050505] min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 md:mb-12 text-xs font-bold tracking-widest uppercase cursor-pointer"
        >
          <X className="w-4 h-4 rotate-45" /> Back to Collection
        </button>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-[4/5] rounded-3xl overflow-hidden bg-[#111]"
          >
            <img 
              src={product.image} 
              alt={product.name} 
              referrerPolicy="no-referrer"
              onError={handleProductImageError}
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div>
              <p className="text-xs font-black tracking-[0.3em] text-white/30 uppercase mb-4">{product.category}</p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 md:mb-6 leading-none">{product.name}</h1>
              <p className="text-2xl md:text-3xl font-light text-white/60 italic">{product.price}</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase">Description</h3>
              <p className="text-white/60 leading-relaxed font-light">
                {product.description || "A masterpiece of design and sound, crafted for the most discerning musicians."}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase">Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                {Object.entries(specs).map(([key, val]) => (
                  <div key={key} className="border-b border-white/5 pb-2">
                    <p className="text-[9px] font-bold text-white/20 uppercase mb-1">{key}</p>
                    <p className="text-xs text-white/70 font-medium">{val as string}</p>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onAddToCart(product)}
              className="w-full bg-white text-black py-4 md:py-6 rounded-full font-black tracking-widest uppercase text-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              Add to Bag <ShoppingBag className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 md:pt-10 border-t border-white/5">
              <div className="text-center">
                <Truck className="w-5 h-5 text-white/20 mx-auto mb-2" />
                <p className="text-[8px] font-bold text-white/30 uppercase">Free Shipping</p>
              </div>
              <div className="text-center">
                <ShieldCheck className="w-5 h-5 text-white/20 mx-auto mb-2" />
                <p className="text-[8px] font-bold text-white/30 uppercase">Lifetime Warranty</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-5 h-5 text-white/20 mx-auto mb-2" />
                <p className="text-[8px] font-bold text-white/30 uppercase">30-Day Returns</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-[#080808] border-t border-white/5 pt-16 md:pt-20 pb-10 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="grid md:grid-cols-4 gap-10 md:gap-12 mb-14 md:mb-20">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold tracking-widest text-white text-2xl uppercase">All In One.</span>
          </div>
          <p className="text-white/40 max-w-sm font-light leading-loose text-base md:text-lg mb-8 italic">
            "We don't just sell guitars; we curate the resonance between the musician and the machine."
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all"><Instagram className="w-5 h-5" /></a>
            <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all"><Facebook className="w-5 h-5" /></a>
          </div>
        </div>
        <div>
          <h5 className="text-white font-bold tracking-widest uppercase text-sm mb-8">Navigation</h5>
          <ul className="space-y-4 text-white/50 font-light uppercase text-xs tracking-widest">
            <li className="hover:text-white transition-colors cursor-pointer">Shop All</li>
            <li className="hover:text-white transition-colors cursor-pointer">Accessories</li>
            <li className="hover:text-white transition-colors cursor-pointer">Store Finder</li>
            <li className="hover:text-white transition-colors cursor-pointer">Artist Roster</li>
          </ul>
        </div>
        <div>
          <h5 className="text-white font-bold tracking-widest uppercase text-sm mb-8">Newsletter</h5>
          <p className="text-white/40 text-xs mb-6 uppercase tracking-wider">Early access to limited drops.</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="EMAIL" 
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-full text-xs focus:outline-none focus:border-white/30"
            />
            <button className="p-3 bg-white text-black rounded-lg hover:bg-white/80 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[9px] sm:text-[10px] tracking-[0.18em] sm:tracking-[0.3em] font-bold text-white/20 uppercase">
        <p>&copy; 2025 ALL IN ONE GUITAR SHOP. EST. 1994.</p>
        <div className="flex gap-5 sm:gap-8">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Shipping</a>
        </div>
      </div>
    </div>
  </footer>
);

// --- PAGE COMPONENTS ---

const InstrumentsPage = ({ onAddToCart, products, onProductClick }: { onAddToCart: (product: any) => void, products: any[], onProductClick: (p: any) => void }) => {
  const [active, setActive] = useState("All");

  const filtered = active === "All"
    ? products
    : products.filter(i => i.category === active.toLowerCase());

  return (
    <section className="bg-[#050505] min-h-screen pt-20 md:pt-24">
      {/* Page Header */}
      <div className="px-4 sm:px-10 pt-8 sm:pt-10 pb-0">
        <span className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30">
          The Collection
        </span>
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white mt-2">
          INSTRUMENTS.
        </h1>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 px-4 sm:px-10 py-6 sm:py-8 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={cn(
              "px-5 py-2 rounded-full border text-[10px] font-black tracking-widest uppercase transition-all duration-300 cursor-pointer",
              active === f
                ? "bg-white text-black border-white"
                : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-[2px] px-4 sm:px-10 pb-16 sm:pb-20">
        <AnimatePresence mode="popLayout">
          {filtered.map((inst, i) => (
            <ProductCard 
              key={inst.id} 
              product={inst} 
              onAddToCart={() => onAddToCart(inst)} 
              onClick={() => onProductClick(inst)}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};

const BODY_STYLES = ["Stratocaster", "Telecaster", "Les Paul", "SG", "Offset"];
const WOODS = [
  { label: "Alder", add: 0 }, { label: "Ash", add: 150 },
  { label: "Mahogany", add: 280 }, { label: "Korina", add: 550 },
];
const PICKUP_CONFIGS = [
  { label: "SSS", add: 0 }, { label: "HSS", add: 180 },
  { label: "HH", add: 220 }, { label: "P90s", add: 150 },
];
const NECK_PROFILES = ["C-Shape", "D-Shape", "Soft V", "U-Shape"];
const FINISH_COLORS = [
  { name: "Midnight Black", hex: "#1a1a1a", add: 0 },
  { name: "Fiesta Red", hex: "#d4a0a0", add: 120 },
  { name: "Lake Placid Blue", hex: "#7b9fc7", add: 120 },
  { name: "Vintage Blonde", hex: "#c8bb8e", add: 80 },
  { name: "Olympic White", hex: "#f0f0f0", add: 120 },
  { name: "Sunburst", hex: "#6a5c4e", add: 0 },
  { name: "Sherwood Green", hex: "#2d4a3e", add: 120 },
  { name: "Sonic Purple", hex: "#8b4a8b", add: 200 },
];

const BASE_PRICE = 2199;

const CustomShopPage = ({ onAddToCart }: { onAddToCart: (product: any) => void }) => {
  const [body, setBody] = useState("Stratocaster");
  const [wood, setWood] = useState(WOODS[0]);
  const [pickups, setPickups] = useState(PICKUP_CONFIGS[0]);
  const [neck, setNeck] = useState("C-Shape");
  const [color, setColor] = useState(FINISH_COLORS[0]);

  const total = BASE_PRICE + wood.add + pickups.add + color.add;

  const handleBuildAddToCart = () => {
    const customProduct = {
      id: `custom-${Date.now()}`,
      name: `Custom ${body}`,
      price: `$${total.toLocaleString()}`,
      image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=600&auto=format&fit=crop",
      category: "Custom Shop",
      details: { body, wood: wood.label, pickups: pickups.label, neck, color: color.name }
    };
    onAddToCart(customProduct);
  };

  const ConfigSection: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-10">
      <p className="text-[9px] font-black tracking-[0.35em] uppercase text-white/35 mb-4">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );

  const Opt: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 border text-[11px] font-black tracking-wider transition-all duration-300 rounded cursor-pointer",
        active ? "bg-white text-black border-white" : "border-white/10 text-white/50 hover:border-white/30"
      )}
    >
      {children}
    </button>
  );

  return (
    <section className="bg-[#050505] min-h-screen pt-20 md:pt-24">
      {/* Hero */}
      <div
        className="relative h-56 sm:h-64 flex items-end px-4 sm:px-10 pb-8 sm:pb-10 overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #080808, #050505)' }}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=2070&auto=format&fit=crop)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10">
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-white/40 mb-3">
            Configure Your Instrument
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-none">
            BUILT.<br /><span className="text-white/20">FOR YOU.</span>
          </h1>
        </div>
      </div>

      {/* Configurator Grid */}
      <div className="grid md:grid-cols-2 gap-[2px]">
        {/* Left: Options */}
        <div className="bg-[#0d0d0d] p-6 sm:p-10">
          <ConfigSection label="Body Style">
            {BODY_STYLES.map(s => (
              <Opt key={s} active={body === s} onClick={() => setBody(s)}>{s}</Opt>
            ))}
          </ConfigSection>

          <ConfigSection label="Wood (Body)">
            {WOODS.map(w => (
              <Opt key={w.label} active={wood.label === w.label} onClick={() => setWood(w)}>
                {w.label} {w.add > 0 && <span className="opacity-40">+${w.add}</span>}
              </Opt>
            ))}
          </ConfigSection>

          <ConfigSection label="Finish Color">
            {FINISH_COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setColor(c)}
                title={c.name}
                className="w-9 h-9 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  background: c.hex,
                  border: color.name === c.name ? '2px solid white' : '2px solid transparent',
                  transform: color.name === c.name ? 'scale(1.15)' : 'scale(1)',
                  outline: c.hex === '#f0f0f0' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                }}
              />
            ))}
          </ConfigSection>

          <ConfigSection label="Pickups">
            {PICKUP_CONFIGS.map(p => (
              <Opt key={p.label} active={pickups.label === p.label} onClick={() => setPickups(p)}>
                {p.label} {p.add > 0 && <span className="opacity-40">+${p.add}</span>}
              </Opt>
            ))}
          </ConfigSection>

          <ConfigSection label="Neck Profile">
            {NECK_PROFILES.map(n => (
              <Opt key={n} active={neck === n} onClick={() => setNeck(n)}>{n}</Opt>
            ))}
          </ConfigSection>
        </div>

        {/* Right: Summary */}
        <div className="bg-[#080808] p-6 sm:p-10 flex flex-col justify-between min-h-[460px] md:min-h-[560px]">
          <div>
            <p className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30 mb-8">Your Build</p>
            {[
              ["Body", body], ["Wood", wood.label],
              ["Finish", color.name], ["Pickups", pickups.label], ["Neck", neck],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-3 border-b border-white/5">
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/30">{label}</span>
                <span className="text-sm font-bold text-white">{val}</span>
              </div>
            ))}
            <div className="mt-8">
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mb-2">Est. Build Time</p>
              <p className="text-base font-bold">6–8 Weeks</p>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mb-2">Total</p>
            <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-1">${total.toLocaleString()}</p>
            <p className="text-[9px] tracking-widest text-white/20 uppercase mb-6">Base price from $2,199</p>
            <button 
              onClick={handleBuildAddToCart}
              className="w-full py-4 bg-white text-black text-[11px] font-black tracking-[0.25em] uppercase hover:bg-white/85 transition-colors cursor-pointer"
            >
              Add to Bag →
            </button>
            <p className="text-center text-[9px] tracking-widest uppercase text-white/20 mt-4">
              Free consultation included
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const ARTIST_ROSTER = [
  { id: "01", slug: 'elena-voss', name: "Elena Voss", genre: "Post-Rock", guitar: "EV-1 Signature", productId: 7,
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop" },
  { id: "02", slug: 'marcus-steele', name: "Marcus Steele", genre: "Jazz Fusion", guitar: "MS-7 Archtop", productId: 8,
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop" },
  { id: "03", slug: 'priya-anand', name: "Priya Anand", genre: "Indie / Folk", guitar: "PA Acoustic Custom", productId: 3,
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop" },
  { id: "04", slug: 'dario-ferretti', name: "Dario Ferretti", genre: "Flamenco", guitar: "DF Nylon Series", productId: 4,
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=120&auto=format&fit=crop" },
  { id: "05", slug: 'kira-nomura', name: "Kira Nomura", genre: "Progressive Metal", guitar: "KN-X7 Extended", productId: 5,
    img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=120&auto=format&fit=crop" },
];

const ARTIST_QUOTES: Record<string, string> = {
  'elena-voss': "Sound isn't just what you hear-it's the architecture of the space you inhabit.",
  'marcus-steele': 'Every note should breathe, even inside the fastest run.',
  'priya-anand': 'A melody is strongest when silence surrounds it.',
  'dario-ferretti': 'Rhythm begins in the hand before it reaches the string.',
  'kira-nomura': 'Precision and chaos can live in the same riff.',
};

const ArtistSeriesPage = ({
  onNav,
  onSelectArtist,
}: {
  onNav: (page: string) => void;
  onSelectArtist: (artistSlug: string) => void;
}) => (
  <section className="bg-[#050505] min-h-screen pt-16 md:pt-20">
    {/* Featured Hero */}
    <div className="relative h-[56vh] md:h-[70vh] overflow-hidden group">
      <img
        src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop"
        alt="Featured Artist"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover brightness-[0.28] group-hover:scale-105 transition-transform duration-[2s]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-10 pb-8 sm:pb-12">
        <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-2 w-fit mb-5">
          <span className="text-[8px] font-black tracking-[0.4em] uppercase text-white/50">
            Featured Series 2026
          </span>
        </div>
        <h2 className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none mb-4 sm:mb-5">
          ELENA<br />VOSS.
        </h2>
        <p className="text-sm sm:text-base text-white/50 max-w-md sm:max-w-lg font-light leading-relaxed mb-6">
          Signature EV-1 model — crafted from Ethiopian rosewood with custom-wound single coils. 
          Limited to 200 pieces worldwide.
        </p>
        <button 
          onClick={() => {
            onSelectArtist('elena-voss');
            onNav('artist-signature');
          }}
          className="inline-flex items-center gap-3 px-6 sm:px-7 py-3 bg-white text-black text-[10px] font-black tracking-[0.2em] sm:tracking-[0.25em] uppercase rounded-full w-fit hover:bg-white/85 transition-colors cursor-pointer"
        >
          View Artist Signature <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Artist Roster */}
    <div className="py-4">
      {ARTIST_ROSTER.map((artist, i) => (
        <motion.div
          key={artist.id}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          onClick={() => {
            onSelectArtist(artist.slug);
            onNav('artist-signature');
          }}
          className="grid grid-cols-[56px_1fr] md:grid-cols-[80px_1fr_auto] items-center bg-[#0a0a0a] hover:bg-[#111] transition-colors cursor-pointer"
          style={{ gap: 0, marginBottom: '2px' }}
        >
          <div className="py-5 md:py-7 px-3 md:px-6 text-[10px] md:text-[11px] font-black tracking-widest text-white/20 border-r border-white/5 text-center">
            {artist.id}
          </div>
          <div className="flex items-center gap-4 md:gap-6 px-4 md:px-8 py-4 md:py-6">
            <img
              src={artist.img}
              alt={artist.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover grayscale hover:grayscale-0 transition-all"
            />
            <div>
              <h3 className="text-lg md:text-xl font-black tracking-tight">{artist.name}</h3>
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mt-1">
                {artist.genre}
              </p>
              <p className="text-xs text-white/25 italic mt-1">{artist.guitar}</p>
            </div>
          </div>
          <div className="pr-8 hidden md:block">
            <span className="px-4 py-1.5 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase text-white/30">
              View Signature
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

type SignatureSpec = { label: string; value: string };

const ELENA_SIGNATURE_FALLBACK = {
  name: 'AIO. Signature "Ethereal"',
  price: 4299,
  description:
    "Designed to bridge the gap between vintage warmth and modern clarity. The Ethereal features custom-voiced pickups that respond to the lightest touch, allowing for the vast dynamic range required by Elena's cinematic compositions.",
  specs: [
    { label: 'Body', value: 'Selected Lightweight Ash' },
    { label: 'Neck', value: "Quartersawn Maple '60s Oval C" },
    { label: 'Pickups', value: "Hand-Wound 'AIO-Tone' Single-Coils" },
    { label: 'Finish', value: 'Obsidian Mirror Nitro' },
  ] as SignatureSpec[],
  image: 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&q=80&w=1200',
};

const parseSignatureSpecs = (value: unknown): SignatureSpec[] => {
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return [];

    return Object.entries(parsed)
      .map(([label, specValue]) => ({ label, value: String(specValue) }))
      .slice(0, 4);
  } catch {
    return [];
  }
};

const pickArtistSignatureProduct = (products: any[], artistSlug: string, mappedProductId?: number): any | null => {
  if (!Array.isArray(products) || products.length === 0) return null;

  const byArtistColumn = products.find((item) => String(item?.artist ?? '').toLowerCase() === artistSlug);
  if (byArtistColumn) return byArtistColumn;

  const byMappedId = products.find((item) => Number(item?.id) === Number(mappedProductId));
  if (byMappedId) return byMappedId;

  const byArtistMatch = products.find((item) => /elena|voss|signature/i.test(String(item?.name ?? '')));
  if (byArtistMatch) return byArtistMatch;

  const byLimitedBadge = products.find((item) => String(item?.badge ?? '').toLowerCase() === 'limited');
  if (byLimitedBadge) return byLimitedBadge;

  return products[0] ?? null;
};

const ElenaVossSignaturePage = ({
  onAddToCart,
  products,
  isLoading,
  artistSlug,
}: {
  onAddToCart: (product: ProductLike) => void;
  products: any[];
  isLoading: boolean;
  artistSlug: string;
}) => {
  const [showCartToast, setShowCartToast] = useState(false);
  const selectedArtist = ARTIST_ROSTER.find((artist) => artist.slug === artistSlug) || ARTIST_ROSTER[0];
  const signatureProduct = pickArtistSignatureProduct(products, selectedArtist.slug, selectedArtist.productId);
  const artistNameParts = selectedArtist.name.toUpperCase().split(' ');
  const artistFirstName = artistNameParts[0] || 'ELENA';
  const artistLastName = artistNameParts.slice(1).join(' ') || 'VOSS';
  const artistQuote = ARTIST_QUOTES[selectedArtist.slug] || ARTIST_QUOTES['elena-voss'];
  const displayName = signatureProduct?.name || ELENA_SIGNATURE_FALLBACK.name;
  const displayPrice = signatureProduct ? toDisplayPrice(signatureProduct.price) : toDisplayPrice(ELENA_SIGNATURE_FALLBACK.price);
  const displayDescription = signatureProduct?.description || ELENA_SIGNATURE_FALLBACK.description;
  const displayImage = signatureProduct?.image || ELENA_SIGNATURE_FALLBACK.image;
  const productSpecs = parseSignatureSpecs(signatureProduct?.specifications);
  const displaySpecs = productSpecs.length > 0
    ? productSpecs
    : signatureProduct
      ? [
          { label: 'Category', value: String(signatureProduct.category || 'general') },
          { label: 'Badge', value: String(signatureProduct.badge || 'Standard') },
          { label: 'Collection', value: 'Instruments' },
          { label: 'Source', value: 'Products Table' },
        ]
      : ELENA_SIGNATURE_FALLBACK.specs;
  const canAddToCart = Boolean(signatureProduct);

  const handleAddToCart = () => {
    if (!signatureProduct) {
      alert('No linked catalog product found for Elena signature yet.');
      return;
    }

    onAddToCart(signatureProduct);

    setShowCartToast(true);
    window.setTimeout(() => setShowCartToast(false), 3000);
  };

  return (
    <section className="bg-black min-h-screen text-white pt-14 md:pt-16">
      <div
        className={cn(
          'fixed bottom-10 right-6 md:right-10 z-[80] transition-all duration-700 transform',
          showCartToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        )}
      >
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center space-x-5 shadow-2xl">
          <div className="bg-white rounded-full p-1">
            <CheckCircle2 className="text-black w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">Added to Bag</p>
            <p className="text-xs font-bold text-white">{displayName}</p>
          </div>
        </div>
      </div>

      <section className="relative h-[95vh] w-full overflow-hidden flex items-end pb-20 md:pb-24 px-6 md:px-24">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent z-10" />
          <SmartImage
            src="https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80&w=2000"
            alt="Elena Voss"
            className="w-full h-full object-cover grayscale opacity-50 scale-100 animate-slow-zoom bg-zinc-900"
          />
          <div className="absolute inset-0 shimmer opacity-10 pointer-events-none" />
        </div>

        <div className="relative z-20 max-w-5xl">
          <div
            className="flex items-center space-x-4 mb-6 animate-fade-in opacity-0"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <div className="w-8 h-px bg-white/40" />
            <span className="text-white/40 text-[10px] font-black tracking-[0.5em] uppercase">Artist Spotlight</span>
          </div>
          <h1
            className="text-7xl md:text-[11rem] font-black tracking-tighter mb-8 leading-[0.8] animate-slide-up opacity-0"
            style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
          >
            {artistFirstName} <br /> {artistLastName}
          </h1>
          <p
            className="text-zinc-400 text-lg md:text-xl max-w-xl mb-12 leading-relaxed font-light italic animate-fade-in opacity-0"
            style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
          >
            "{artistQuote}"
          </p>
          <button
            onClick={() => document.getElementById('signature-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="group flex items-center space-x-6 bg-white text-black pl-10 pr-6 py-5 rounded-full font-black tracking-[0.2em] uppercase text-[10px] hover:bg-zinc-200 transition-all duration-500 transform hover:-translate-y-1 animate-fade-in opacity-0"
            style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}
          >
            <span>Signature Model</span>
            <div className="bg-black/5 rounded-full p-2 group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </section>

      <section id="signature-section" className="py-28 md:py-40 px-6 md:px-24 max-w-7xl mx-auto min-h-[700px] flex items-center">
        {isLoading ? (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="aspect-[4/5] bg-zinc-900 rounded-2xl shimmer relative overflow-hidden" />
            <div className="space-y-8">
              <div className="w-24 h-4 bg-zinc-900 shimmer rounded" />
              <div className="w-full h-20 bg-zinc-900 shimmer rounded" />
              <div className="w-3/4 h-32 bg-zinc-900 shimmer rounded" />
              <div className="w-40 h-12 bg-zinc-900 shimmer rounded-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1 relative group">
              <div className="absolute -inset-10 bg-white/[0.02] blur-[120px] rounded-full group-hover:bg-white/[0.05] transition-all duration-1000" />
              <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                <SmartImage
                  src={displayImage || PRODUCT_IMAGE_FALLBACK}
                  alt={displayName || 'Signature guitar'}
                  type="guitar"
                  className="relative z-10 w-full h-auto transform transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-10">
              <div className="space-y-4">
                <h2 className="text-zinc-600 text-[10px] font-black tracking-[0.4em] uppercase">THE INSTRUMENT</h2>
                <h3 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">{displayName}</h3>
                <p className="text-3xl text-white/40 font-extralight tracking-widest italic">{displayPrice}</p>
              </div>

              <p className="text-zinc-400 leading-relaxed font-light text-xl">{displayDescription}</p>

              <div className="grid grid-cols-2 gap-x-12 gap-y-8 pt-10 border-t border-white/5">
                {displaySpecs.map((spec) => (
                  <div key={spec.label} className="group">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] mb-2 group-hover:text-white/40 transition-colors">
                      {spec.label}
                    </p>
                    <p className="text-sm font-bold text-zinc-200 tracking-wide">{spec.value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className="w-full sm:w-auto bg-transparent border border-white/10 hover:border-white hover:bg-white hover:text-black px-16 py-5 rounded-full font-black tracking-[0.2em] uppercase text-[10px] transition-all duration-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add to Bag
              </button>
              {!canAddToCart && (
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                  No matching product found in instruments table.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="py-20 md:py-32 px-4 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px] md:h-[900px]">
          <div className="relative group overflow-hidden md:col-span-2 bg-zinc-900 rounded-3xl shadow-2xl cursor-none">
            <SmartImage
              src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop"
              className="w-full h-full object-cover transform transition-all duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100 grayscale-[0.3] group-hover:grayscale-0"
              alt="Studio Session"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 transform scale-50 group-hover:scale-100 transition-transform duration-700">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
              <p className="text-[10px] tracking-[0.5em] uppercase font-black text-white">Watch Session</p>
            </div>
          </div>

          <div className="grid grid-rows-2 gap-6">
            <div className="overflow-hidden bg-zinc-900 rounded-3xl relative group cursor-pointer shadow-xl">
              <SmartImage
                src="https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=2070&auto=format&fit=crop"
                className="w-full h-full object-cover transition-all duration-[2s] hover:scale-110 opacity-70 hover:opacity-100"
                alt="Live Performance"
              />
            </div>
            <div className="overflow-hidden bg-zinc-900/40 flex flex-col items-center justify-center p-12 space-y-6 rounded-3xl border border-white/5 backdrop-blur-sm relative group cursor-pointer">
              <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40">The Tour</h4>
              <p className="text-center text-zinc-200 text-lg italic font-light leading-relaxed">
                Join the 2026 <br /> 'Monolith' Global Tour
              </p>
              <button className="text-[9px] font-black border-b border-white/20 pb-2 hover:border-white transition-all uppercase tracking-[0.3em] text-white/60 hover:text-white">
                View Schedule
              </button>
            </div>
          </div>
        </div>
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slow-zoom { from { transform: scale(1); } to { transform: scale(1.1); } }
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-fade-in { animation: fade-in 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .animate-slide-up { animation: slide-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .animate-slow-zoom { animation: slow-zoom 30s ease-in-out infinite alternate; }
            .shimmer {
              position: relative;
              overflow: hidden;
            }
            .shimmer::after {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
              animation: shimmer 2s infinite linear;
            }
          `,
        }}
      />
    </section>
  );
};

const AboutPage = () => (
  <section className="bg-[#050505] min-h-screen pt-24 md:pt-32 px-4 sm:px-10">
    <div className="max-w-4xl">
      <span className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30">
        Our Story
      </span>
      <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white mt-2 mb-8 md:mb-12">
        EST. 1994.
      </h1>
      <div className="grid md:grid-cols-2 gap-10 md:gap-16">
        <p className="text-lg sm:text-xl text-white/60 font-light leading-relaxed italic">
          "What started as a small workshop in a garage has grown into a global destination for musicians who demand the absolute best. We don't just sell guitars; we curate the resonance between the musician and the machine."
        </p>
        <div className="space-y-8 text-white/40 font-light leading-loose">
          <p>
            Every instrument that passes through our doors is hand-inspected, set up to perfection, and treated with the respect it deserves. Our team of master luthiers and passionate musicians are here to help you find your voice.
          </p>
          <p>
            Whether you're looking for a vintage classic, a modern workhorse, or a one-of-a-kind custom build, AIO is your home for all things guitar.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const ProfilePage = ({ user }: { user: FirebaseUser }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error("Fetch orders error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user.uid]);

  return (
    <section className="pt-32 pb-24 px-6 min-h-screen bg-black">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-16">
          <div>
            <span className="text-[10px] tracking-[0.5em] font-black uppercase text-white/30 mb-4 block">Account Overview</span>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter uppercase leading-none">
              {user.displayName}
            </h1>
            <p className="text-white/40 text-sm mt-4 font-mono tracking-widest uppercase">{user.email}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center min-w-[140px]">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Orders</p>
              <p className="text-3xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center min-w-[140px]">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Status</p>
              <p className="text-3xl font-bold text-white uppercase text-xs tracking-widest mt-3">Verified</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter border-b border-white/10 pb-4">Order History</h2>
          
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-white/40 uppercase tracking-widest text-xs">No orders found yet.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => {
                const items = Array.isArray(order.items_json)
                  ? order.items_json
                  : (() => {
                      try {
                        return JSON.parse(order.items_json || '[]');
                      } catch {
                        return [];
                      }
                    })();
                return (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-all group">
                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                      <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Order ID</p>
                        <p className="text-xs font-mono text-white/80">#AIO-{order.id.toString().padStart(6, '0')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Date</p>
                        <p className="text-xs text-white/80">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Status</p>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-xl font-bold text-white">${order.total.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 pt-6 border-t border-white/5">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" onError={handleProductImageError} />
                          <div>
                            <p className="text-[10px] font-bold text-white tracking-tight">{item.name}</p>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default function App() {
  const [page, setPage] = useState('home');
  const [selectedArtistSlug, setSelectedArtistSlug] = useState('elena-voss');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const loadCart = async (userId: string) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;

    setCartItems((data || []).map((item): CartItem => {
      const id = String(item.id ?? '');
      return {
        id,
        product_id: item.product_id,
        user_id: item.user_id,
        name: String(item.name ?? 'Item'),
        price: toDisplayPrice(item.price),
        image: String(item.image ?? ''),
        category: String(item.category ?? ''),
        quantity: Number(item.quantity) || 1,
      };
    }));
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');

        if (error) throw error;
        setProducts((data || []).map((product) => ({
          ...product,
          price: toDisplayPrice(product.price),
        })));
      } catch (err) {
        console.error("Fetch products error:", err);
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        // Sync Firebase user to Supabase
        try {
          const { error } = await supabase
            .from('app_users')
            .upsert({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              display_name: firebaseUser.displayName
            });

          if (error) {
            console.error('Supabase insert error:', error);
          } else {
            console.log('User saved to Supabase ✅');
          }

          await loadCart(firebaseUser.uid);
        } catch (error) {
          console.error("Sync error:", error);
        }
      } else {
        setCartItems([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        alert("The login popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login request was cancelled by a newer request.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the login popup.");
      } else {
        console.error("Login failed:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPage('home');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const addToCart = async (product: ProductLike) => {
    const activeUser = auth.currentUser ?? user;
    if (!activeUser) {
      alert('Login first');
      return;
    }

    try {
      const cleanPrice = Number(product.price.toString().replace(/[$,]/g, ''));
      const rawProductId = product.product_id ?? product.id;
      const normalizedProductId = normalizeProductId(rawProductId);

      if (Number.isNaN(cleanPrice) || normalizedProductId === null) {
        alert('Invalid product data');
        return;
      }

      const { data, error: lookupError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', activeUser.uid)
        .eq('product_id', normalizedProductId);

      if (lookupError) throw lookupError;

      const existing = (data && data.length > 0) ? data[0] : null;

      if (existing) {
        const existingQuantity = Number(existing.quantity) || 0;
        const existingId = Number(existing.id);
        if (!Number.isFinite(existingId)) {
          throw new Error('Invalid existing cart row id');
        }

        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingQuantity + 1 })
          .eq('id', existingId)
          .eq('user_id', activeUser.uid);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: activeUser.uid,
            product_id: normalizedProductId,
            name: product.name,
            price: cleanPrice,
            image: product.image,
            category: product.category || product.cat || 'General',
            quantity: 1
          });

        if (insertError) throw insertError;
      }

      await loadCart(activeUser.uid);
      setIsCartOpen(true);
      alert('Added to bag ✅');
    } catch (error) {
      console.error("Add to cart error:", error);
      alert('Error adding to cart');
    }
  };

  const updateCartQuantity = async (itemId: string, delta: number) => {
    if (!user) return;
    const item = cartItems.find((entry) => String(entry.id) === String(itemId));
    if (!item) return;

    const targetRowId = Number(item.id);
    if (!Number.isFinite(targetRowId)) return;

    const currentQuantity = Number(item.quantity) || 0;
    const newQuantity = currentQuantity + delta;
    try {
      if (newQuantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.uid)
          .eq('id', targetRowId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('user_id', user.uid)
          .eq('id', targetRowId);

        if (error) throw error;
      }

      await loadCart(user.uid);
    } catch (error) {
      console.error("Update quantity error:", error);
      alert('Could not update item quantity. Please try again.');
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) return;
    const item = cartItems.find((entry) => String(entry.id) === String(itemId));
    if (!item) return;

    const targetRowId = String(item.id ?? '');
    if (!targetRowId) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.uid)
        .eq('id', targetRowId);

      if (error) throw error;

      await loadCart(user.uid);
    } catch (error) {
      console.error("Remove error:", error);
      alert('Could not remove item from bag. Please try again.');
    }
  };

  const handleCheckout = async (shippingDetails: ShippingDetails) => {
    if (!user || cartItems.length === 0) return;
    
    try {
      const total = cartItems.reduce((acc, item) => {
        return acc + (toNumericPrice(item.price) * item.quantity);
      }, 0);

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.uid,
          items_json: JSON.stringify(cartItems),
          total,
          full_name: shippingDetails.fullName,
          address: shippingDetails.address,
          city: shippingDetails.city,
          zip_code: shippingDetails.zipCode,
          phone: shippingDetails.phone,
          status: 'pending'
        })

      if (orderError) throw orderError;

      if (user.email) {
        try {
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.displayName || shippingDetails.fullName || 'User',
              items: cartItems,
              total,
            }),
          });

          if (!emailResponse.ok) {
            const emailErrorText = await emailResponse.text();
            console.error('Invoice email failed:', emailErrorText);
          }
        } catch (emailError) {
          console.error('Invoice email error:', emailError);
        }
      }

      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.uid);

      if (clearError) throw clearError;

      setCartItems([]);
      setIsCartOpen(false);
      setPage('profile');
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="bg-black min-h-screen font-sans text-white selection:bg-white selection:text-black">
      <Navbar 
        onNav={setPage} 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        isLoggingIn={isLoggingIn}
      />
      
      <Cart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {page === 'home' && (
            <>
              <Hero />

              {/* Intro Narrative Section */}
              <section className="py-20 md:py-32 bg-[#050505] px-4 sm:px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:40px_40px]" />
                </div>
                
                <div className="max-w-4xl mx-auto text-center relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    viewport={{ once: true }}
                  >
                    <span className="inline-block px-4 py-1 rounded-full border border-white/20 text-[10px] tracking-[0.4em] uppercase font-bold mb-10 text-white/60">
                      The Philosophy
                    </span>
                    <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-8 md:mb-10 text-white leading-[0.9]">
                      PURE SOUND. <br/> <span className="text-white/20">NO COMPROMISE.</span>
                    </h2>
                    <p className="text-lg md:text-2xl text-white/60 font-light leading-relaxed italic max-w-2xl mx-auto">
                      "We believe that the perfect guitar is more than an instrument; it's the extension of your soul. Our shop is built on the singular mission of curating that connection."
                    </p>
                  </motion.div>
                </div>
              </section>

              {/* Product Grid */}
              <section className="py-16 md:py-24 px-4 sm:px-6 bg-black">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                      <span className="text-[10px] tracking-[0.5em] font-black uppercase text-white/30 mb-4 block">New Arrivals</span>
                      <h2 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tighter">The Curated Batch.</h2>
                    </div>
                    <button 
                      onClick={() => setPage('instruments')}
                      className="text-xs font-bold uppercase tracking-widest border-b-2 border-white/20 pb-2 hover:border-white transition-all cursor-pointer"
                    >
                      Explore Collection
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                    {products.slice(0, 3).map(product => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onAddToCart={() => addToCart(product)} 
                        onClick={() => {
                          setSelectedProduct(product);
                          setPage('product-detail');
                        }}
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* Featured Artist Promo */}
              <section className="h-[56vh] md:h-[70vh] relative overflow-hidden group">
                <img 
                  src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop" 
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:scale-105 transition-transform duration-[2s]"
                  alt="Artist Studio"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent flex items-center px-4 sm:px-12">
                  <div className="max-w-2xl">
                    <h3 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-none tracking-tighter">
                      BEYOND THE <br /> <span className="italic font-light">STRINGS.</span>
                    </h3>
                    <p className="text-white/60 text-base md:text-lg mb-8 sm:mb-10 max-w-md font-light leading-relaxed">
                      Join the guild. Access masterclasses, tone-shaping workshops, and limited edition collaboration drops.
                    </p>
                    <button 
                      onClick={() => setPage('artists')}
                      className="px-7 sm:px-10 py-3 sm:py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white/90 transition-all flex items-center gap-3 sm:gap-4 cursor-pointer"
                    >
                      Join the Guild <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>

              <Features />
            </>
          )}
          {page === 'instruments' && (
            <InstrumentsPage 
              onAddToCart={addToCart} 
              products={products} 
              onProductClick={(p) => {
                setSelectedProduct(p);
                setPage('product-detail');
              }}
            />
          )}
          {page === 'product-detail' && (
            <ProductDetailPage 
              product={selectedProduct} 
              onAddToCart={addToCart} 
              onBack={() => setPage('instruments')} 
            />
          )}
          {page === 'custom' && <CustomShopPage onAddToCart={addToCart} />}
          {page === 'artists' && <ArtistSeriesPage onNav={setPage} onSelectArtist={setSelectedArtistSlug} />}
          {(page === 'artist-signature' || page === 'artist-signature-elena-voss') && (
            <ElenaVossSignaturePage
              onAddToCart={addToCart}
              products={products}
              isLoading={isProductsLoading}
              artistSlug={selectedArtistSlug}
            />
          )}
          {page === 'about' && <AboutPage />}
          {page === 'profile' && user && <ProfilePage user={user} />}
        </motion.div>
      </AnimatePresence>
      
      <Footer />
    </main>
  );
}
