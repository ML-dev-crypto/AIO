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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-4 flex items-center justify-between",
      scrolled ? "bg-black/80 backdrop-blur-lg border-b border-white/10 py-3" : "bg-transparent"
    )}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNav('home')}>
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <Music className="w-5 h-5 text-black" />
        </div>
        <span className="font-bold tracking-widest text-white text-xl">AIO.</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-white/70">
        <button onClick={() => onNav('instruments')} className="hover:text-white transition-colors cursor-pointer">Instruments</button>
        <button onClick={() => onNav('custom')} className="hover:text-white transition-colors cursor-pointer">Custom Shop</button>
        <button onClick={() => onNav('artists')} className="hover:text-white transition-colors cursor-pointer">Artist Series</button>
        <button onClick={() => onNav('about')} className="hover:text-white transition-colors cursor-pointer">About</button>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenCart}
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
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNav('profile')}
              className="hidden md:block text-right group cursor-pointer"
            >
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none group-hover:text-white/60 transition-colors">Welcome</p>
              <p className="text-xs font-bold text-white tracking-tight group-hover:text-white/80 transition-colors">{user.displayName?.split(' ')[0]}</p>
            </button>
            <button 
              onClick={onLogout}
              className="text-white/40 hover:text-white p-2 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            disabled={isLoggingIn}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </span>
          </button>
        )}

        <button className="md:hidden text-white cursor-pointer">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
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
  items: any[], 
  onUpdateQuantity: (id: string, delta: number) => void, 
  onRemove: (id: string) => void,
  onCheckout: (details: any) => void
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: ''
  });

  const total = items.reduce((acc, item) => {
    const price = parseFloat(item.price.replace('$', '').replace(',', ''));
    return acc + (price * item.quantity);
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
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
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

            <div className="flex-1 overflow-y-auto p-8">
              {!isCheckingOut ? (
                <div className="space-y-8">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                      <ShoppingBag className="w-16 h-16 mb-6" />
                      <p className="text-xs font-bold tracking-widest uppercase">Your bag is empty</p>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex gap-6 group">
                        <div className="w-24 h-32 bg-[#111] rounded-lg overflow-hidden flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="text-sm font-bold tracking-tight">{item.name}</h3>
                              <button 
                                onClick={() => onRemove(item.id)}
                                className="text-white/20 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mt-1">{item.category}</p>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 bg-white/5 rounded-full px-3 py-1 border border-white/5">
                              <button 
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="p-1 hover:text-white text-white/40 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="p-1 hover:text-white text-white/40 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm font-bold italic">{item.price}</p>
                          </div>
                        </div>
                      </div>
                    ))
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
                  <div className="grid grid-cols-2 gap-4">
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
              <div className="p-8 bg-white/5 border-t border-white/10 space-y-6">
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
  <section className="bg-black py-32 px-6">
    <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
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
    <section className="bg-[#050505] min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 text-xs font-bold tracking-widest uppercase cursor-pointer"
        >
          <X className="w-4 h-4 rotate-45" /> Back to Collection
        </button>

        <div className="grid lg:grid-cols-2 gap-20 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-[4/5] rounded-3xl overflow-hidden bg-[#111]"
          >
            <img 
              src={product.image} 
              alt={product.name} 
              referrerPolicy="no-referrer"
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
              <h1 className="text-6xl font-black tracking-tighter uppercase mb-6 leading-none">{product.name}</h1>
              <p className="text-3xl font-light text-white/60 italic">{product.price}</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase">Description</h3>
              <p className="text-white/60 leading-relaxed font-light">
                {product.description || "A masterpiece of design and sound, crafted for the most discerning musicians."}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase">Specifications</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
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
              className="w-full bg-white text-black py-6 rounded-full font-black tracking-widest uppercase text-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              Add to Bag <ShoppingBag className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-3 gap-4 pt-10 border-t border-white/5">
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
  <footer className="bg-[#080808] border-t border-white/5 pt-20 pb-10 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="grid md:grid-cols-4 gap-12 mb-20">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold tracking-widest text-white text-2xl uppercase">All In One.</span>
          </div>
          <p className="text-white/40 max-w-sm font-light leading-loose text-lg mb-8 italic">
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
      <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] tracking-[0.3em] font-bold text-white/20 uppercase">
        <p>&copy; 2025 ALL IN ONE GUITAR SHOP. EST. 1994.</p>
        <div className="flex gap-8">
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
    <section className="bg-[#050505] min-h-screen pt-24">
      {/* Page Header */}
      <div className="px-10 pt-10 pb-0">
        <span className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30">
          The Collection
        </span>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mt-2">
          INSTRUMENTS.
        </h1>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 px-10 py-8 flex-wrap">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px] px-10 pb-20">
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
    <section className="bg-[#050505] min-h-screen pt-24">
      {/* Hero */}
      <div
        className="relative h-64 flex items-end px-10 pb-10 overflow-hidden"
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
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white leading-none">
            BUILT.<br /><span className="text-white/20">FOR YOU.</span>
          </h1>
        </div>
      </div>

      {/* Configurator Grid */}
      <div className="grid md:grid-cols-2 gap-[2px]">
        {/* Left: Options */}
        <div className="bg-[#0d0d0d] p-10">
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
        <div className="bg-[#080808] p-10 flex flex-col justify-between min-h-[560px]">
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
            <p className="text-5xl font-black tracking-tighter mb-1">${total.toLocaleString()}</p>
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
  { id: "01", name: "Elena Voss", genre: "Post-Rock", guitar: "EV-1 Signature",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop" },
  { id: "02", name: "Marcus Steele", genre: "Jazz Fusion", guitar: "MS-7 Archtop",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop" },
  { id: "03", name: "Priya Anand", genre: "Indie / Folk", guitar: "PA Acoustic Custom",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop" },
  { id: "04", name: "Dario Ferretti", genre: "Flamenco", guitar: "DF Nylon Series",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=120&auto=format&fit=crop" },
  { id: "05", name: "Kira Nomura", genre: "Progressive Metal", guitar: "KN-X7 Extended",
    img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=120&auto=format&fit=crop" },
];

const ArtistSeriesPage = ({ onNav }: { onNav: (page: string) => void }) => (
  <section className="bg-[#050505] min-h-screen pt-20">
    {/* Featured Hero */}
    <div className="relative h-[70vh] overflow-hidden group">
      <img
        src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop"
        alt="Featured Artist"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover brightness-[0.28] group-hover:scale-105 transition-transform duration-[2s]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end px-10 pb-12">
        <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-2 w-fit mb-5">
          <span className="text-[8px] font-black tracking-[0.4em] uppercase text-white/50">
            Featured Series 2026
          </span>
        </div>
        <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-none mb-5">
          ELENA<br />VOSS.
        </h2>
        <p className="text-base text-white/50 max-w-lg font-light leading-relaxed mb-6">
          Signature EV-1 model — crafted from Ethiopian rosewood with custom-wound single coils. 
          Limited to 200 pieces worldwide.
        </p>
        <button 
          onClick={() => onNav('instruments')}
          className="inline-flex items-center gap-3 px-7 py-3.5 bg-white text-black text-[10px] font-black tracking-[0.25em] uppercase rounded-full w-fit hover:bg-white/85 transition-colors cursor-pointer"
        >
          View Signature Guitar <ChevronRight className="w-4 h-4" />
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
          onClick={() => onNav('instruments')}
          className="grid items-center bg-[#0a0a0a] hover:bg-[#111] transition-colors cursor-pointer"
          style={{ gridTemplateColumns: '80px 1fr auto', gap: 0, marginBottom: '2px' }}
        >
          <div className="py-7 px-6 text-[11px] font-black tracking-widest text-white/20 border-r border-white/5 text-center">
            {artist.id}
          </div>
          <div className="flex items-center gap-6 px-8 py-6">
            <img
              src={artist.img}
              alt={artist.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover grayscale hover:grayscale-0 transition-all"
            />
            <div>
              <h3 className="text-xl font-black tracking-tight">{artist.name}</h3>
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mt-1">
                {artist.genre}
              </p>
              <p className="text-xs text-white/25 italic mt-1">{artist.guitar}</p>
            </div>
          </div>
          <div className="pr-8">
            <span className="px-4 py-1.5 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase text-white/30">
              View Series
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

const AboutPage = () => (
  <section className="bg-[#050505] min-h-screen pt-32 px-10">
    <div className="max-w-4xl">
      <span className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30">
        Our Story
      </span>
      <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mt-2 mb-12">
        EST. 1994.
      </h1>
      <div className="grid md:grid-cols-2 gap-16">
        <p className="text-xl text-white/60 font-light leading-relaxed italic">
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
        const res = await fetch(`/api/orders/${user.uid}`);
        const data = await res.json();
        setOrders(data);
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
                const items = JSON.parse(order.items_json);
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
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" />
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Fetch products error:", err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        // Sync user to SQL Database
        try {
          await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName
            })
          });

          // Fetch Cart
          const response = await fetch(`/api/cart/${firebaseUser.uid}`);
          const items = await response.json();
          setCartItems(items);
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

  const addToCart = async (product: any) => {
    if (!user) {
      await handleLogin();
      return;
    }

    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category || product.cat
        })
      });

      // Refresh cart
      const response = await fetch(`/api/cart/${user.uid}`);
      const items = await response.json();
      setCartItems(items);
      setIsCartOpen(true);
    } catch (error) {
      console.error("Add to cart error:", error);
    }
  };

  const updateCartQuantity = async (itemId: string, delta: number) => {
    if (!user) return;
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    try {
      await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });

      // Refresh cart
      const response = await fetch(`/api/cart/${user.uid}`);
      const items = await response.json();
      setCartItems(items);
    } catch (error) {
      console.error("Update quantity error:", error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) return;
    try {
      await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      
      // Refresh cart
      const response = await fetch(`/api/cart/${user.uid}`);
      const items = await response.json();
      setCartItems(items);
    } catch (error) {
      console.error("Remove error:", error);
    }
  };

  const handleCheckout = async (shippingDetails: any) => {
    if (!user || cartItems.length === 0) return;
    
    try {
      const total = cartItems.reduce((acc, item) => {
        const price = parseFloat(item.price.replace('$', '').replace(',', ''));
        return acc + (price * item.quantity);
      }, 0);

      await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          items: cartItems,
          total,
          shippingDetails
        })
      });

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
              <section className="py-32 bg-[#050505] px-6 relative overflow-hidden">
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
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-10 text-white leading-[0.9]">
                      PURE SOUND. <br/> <span className="text-white/20">NO COMPROMISE.</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-white/60 font-light leading-relaxed italic max-w-2xl mx-auto">
                      "We believe that the perfect guitar is more than an instrument; it's the extension of your soul. Our shop is built on the singular mission of curating that connection."
                    </p>
                  </motion.div>
                </div>
              </section>

              {/* Product Grid */}
              <section className="py-24 px-6 bg-black">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                      <span className="text-[10px] tracking-[0.5em] font-black uppercase text-white/30 mb-4 block">New Arrivals</span>
                      <h2 className="text-4xl font-bold text-white uppercase tracking-tighter">The Curated Batch.</h2>
                    </div>
                    <button 
                      onClick={() => setPage('instruments')}
                      className="text-xs font-bold uppercase tracking-widest border-b-2 border-white/20 pb-2 hover:border-white transition-all cursor-pointer"
                    >
                      Explore Collection
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-10">
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
              <section className="h-[70vh] relative overflow-hidden group">
                <img 
                  src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop" 
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:scale-105 transition-transform duration-[2s]"
                  alt="Artist Studio"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent flex items-center px-12">
                  <div className="max-w-2xl">
                    <h3 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-none tracking-tighter">
                      BEYOND THE <br /> <span className="italic font-light">STRINGS.</span>
                    </h3>
                    <p className="text-white/60 text-lg mb-10 max-w-md font-light leading-relaxed">
                      Join the guild. Access masterclasses, tone-shaping workshops, and limited edition collaboration drops.
                    </p>
                    <button 
                      onClick={() => setPage('artists')}
                      className="px-10 py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white/90 transition-all flex items-center gap-4 cursor-pointer"
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
          {page === 'artists' && <ArtistSeriesPage onNav={setPage} />}
          {page === 'about' && <AboutPage />}
          {page === 'profile' && user && <ProfilePage user={user} />}
        </motion.div>
      </AnimatePresence>
      
      <Footer />
    </main>
  );
}
