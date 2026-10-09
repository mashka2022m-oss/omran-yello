import React from 'react';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 artistic-pattern">
      {/* Ambient Gradient Orbs dynamically adapted to Duolingo Yellow theme */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ backgroundColor: 'var(--complex-accent, #ffc800)' }}
      />
      <div
        className="absolute top-1/4 -right-40 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-18"
        style={{ backgroundColor: 'var(--duo-blue, #1cb0f6)', animationDuration: '10s' }}
      />
      <div
        className="absolute -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-30 animate-pulse"
        style={{ backgroundColor: 'var(--complex-secondary, #203843)', animationDuration: '8s' }}
      />
      
      {/* Duolingo Micro-Grid Matrix Overlay */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(var(--complex-accent-rgb, 255, 200, 0), 0.08) 1.5px, transparent 0)',
          backgroundSize: '36px 36px'
        }} 
      />
    </div>
  );
};

