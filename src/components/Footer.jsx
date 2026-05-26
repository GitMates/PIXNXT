import React from 'react';
import { cn } from '../lib/utils';
import { Typography } from './ui/Typography';
import { Container } from './ui/Container';

const Footer = () => {
    return (
        <footer className="border-t border-zinc-100 bg-white py-16 md:py-24">
            <Container>
                <div className="flex flex-col items-center justify-between gap-12 md:flex-row">
                    <div className="flex flex-col items-center gap-4 md:items-start">
                        <span className="text-xl font-bold tracking-tightest uppercase text-zinc-950">PIXNXT</span>
                        <Typography variant="muted" className="text-center md:text-left">
                          Designed for photographers. Built to help you grow.
                        </Typography>
                    </div>
                    
                    <div className="flex gap-10">
                      <FooterLink href="#">Features</FooterLink>
                      <FooterLink href="#">Pricing</FooterLink>
                      <FooterLink href="#">Support</FooterLink>
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center justify-between border-t border-zinc-50 pt-16 md:flex-row md:mt-24">
                    <Typography variant="muted" className="text-xs">
                      © {new Date().getFullYear()} PIXNXT. All rights reserved.
                    </Typography>
                    <div className="mt-4 flex gap-8 md:mt-0">
                        <FooterLink href="#" className="font-normal opacity-40">Terms</FooterLink>
                        <FooterLink href="#" className="font-normal opacity-40">Privacy</FooterLink>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

function FooterLink({ href, children, className }) {
  return (
    <a 
      href={href} 
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-950 transition-colors",
        className
      )}
    >
      {children}
    </a>
  );
}

export default Footer;
