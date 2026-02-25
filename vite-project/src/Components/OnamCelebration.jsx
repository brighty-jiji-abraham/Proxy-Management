import React from "react";

function OnamCelebration() {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-center bg-no-repeat bg-cover overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(255,248,220,0.9) 0%, rgba(254,240,138,0.8) 25%, rgba(252,211,77,0.7) 50%, rgba(245,158,11,0.8) 75%, rgba(217,119,6,0.9) 100%)"
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-xl animate-pulse"></div>
        <div className="absolute top-20 right-16 w-24 h-24 bg-orange-400 rounded-full opacity-15 blur-lg animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-green-400 rounded-full opacity-10 blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-32 right-12 w-28 h-28 bg-red-400 rounded-full opacity-20 blur-xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
        
        {/* Additional floating particles */}
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-300 rounded-full opacity-10 blur-lg animate-bounce" style={{animationDuration: '3s', animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-purple-300 rounded-full opacity-15 blur-xl animate-bounce" style={{animationDuration: '4s', animationDelay: '2.5s'}}></div>
      </div>

      {/* Main content card with entrance animation */}
      <div className="relative z-20 max-w-2xl mx-auto text-center px-6 animate-fade-in-up" style={{
        animation: 'fadeInUp 1.2s ease-out forwards'
      }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl px-8 sm:px-12 py-12 sm:py-16 ring-1 ring-amber-200 border border-white/30 relative overflow-hidden hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02]">
          
          {/* Animated decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-yellow-400 to-transparent rounded-br-full opacity-30 animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-400 to-transparent rounded-bl-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-green-400 to-transparent rounded-tr-full opacity-30 animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-red-400 to-transparent rounded-tl-full opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>

          {/* Enhanced Pookalam with rotation animation */}
          <div className="flex justify-center items-center mb-8" style={{
            animation: 'slideDown 1s ease-out 0.3s both'
          }}>
            <div className="relative animate-spin-slow" style={{
              animation: 'slowSpin 20s linear infinite'
            }}>
              {/* Outer petals */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 relative">
                  {Array.from({length: 8}).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute w-4 h-8 bg-gradient-to-t from-yellow-400 to-yellow-200 rounded-full opacity-70 transform origin-bottom hover:scale-110 transition-transform duration-300"
                      style={{
                        transform: `rotate(${i * 45}deg) translateY(-20px)`,
                        transformOrigin: '50% 100%',
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Middle ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 relative">
                  {Array.from({length: 6}).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute w-3 h-6 bg-gradient-to-t from-orange-400 to-orange-200 rounded-full opacity-80 transform origin-bottom hover:scale-110 transition-transform duration-300"
                      style={{
                        transform: `rotate(${i * 60}deg) translateY(-12px)`,
                        transformOrigin: '50% 100%',
                        animationDelay: `${i * 0.15}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Center flower with pulse animation */}
              <div className="relative flex items-center justify-center w-16 h-16">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-orange-300 to-red-400 shadow-lg ring-4 ring-white/50 animate-pulse">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-100 to-transparent opacity-60"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main heading with perfect alignment and text animations */}
          <div className="text-center" style={{
            animation: 'slideUp 1s ease-out 0.6s both'
          }}>
<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-amber-600 mb-4 sm:mb-6 tracking-tight leading-[0.9] drop-shadow-sm relative" style={{
              background: 'linear-gradient(to right, #d97706, #ca8a04, #ea580c)',
              WebkitBackgroundClip: 'text',
              // WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>              <span className="inline-block animate-bounce" style={{animationDelay: '0s', animationDuration: '2s'}}>O</span>
              <span className="inline-block animate-bounce" style={{animationDelay: '0.1s', animationDuration: '2s'}}>n</span>
              <span className="inline-block animate-bounce" style={{animationDelay: '0.2s', animationDuration: '2s'}}>a</span>
              <span className="inline-block animate-bounce" style={{animationDelay: '0.3s', animationDuration: '2s'}}>m</span>
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-700 mb-6 sm:mb-8 tracking-wide leading-tight" style={{
              animation: 'slideUp 1s ease-out 0.9s both'
            }}>
              Treasure Hunt
            </h2>
          </div>

          {/* Enhanced coming soon badge with hover effects */}
          <div className="mb-6 sm:mb-8 relative flex justify-center" style={{
            animation: 'slideUp 1s ease-out 1.2s both'
          }}>
            <div className="inline-block relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <span className="relative inline-block px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white rounded-full font-bold text-base sm:text-lg tracking-wider shadow-lg transform group-hover:scale-105 transition-all duration-300 animate-pulse">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Enhanced description with better text alignment */}
          <div className="max-w-xl mx-auto mb-6 sm:mb-8 px-4" style={{
            animation: 'slideUp 1s ease-out 1.5s both'
          }}>
            <p className="text-amber-700 text-base sm:text-lg font-medium leading-relaxed text-center">
              Experience the joy, tradition, and magnificent colors of Onam with us!
            </p>
          </div>

          {/* Animated decorative separator */}
          <div className="flex items-center justify-center my-6 sm:my-8" style={{
            animation: 'slideUp 1s ease-out 1.8s both'
          }}>
            <div className="flex space-x-2">
              {['yellow', 'orange', 'red', 'green', 'blue'].map((color, index) => (
                <div 
                  key={color}
                  className={`w-2 h-2 rounded-full bg-${color}-400 animate-bounce`}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    animationDuration: '1.5s'
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Location and year with perfect alignment */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 sm:p-6 border border-amber-200 text-center hover:bg-gradient-to-r hover:from-amber-100 hover:to-yellow-100 transition-all duration-300" style={{
            animation: 'slideUp 1s ease-out 2.1s both'
          }}>
            <p className="text-amber-700 font-semibold text-lg sm:text-xl leading-tight mb-1">
              Govt. Cyberpark, Kozhikode
            </p>
            <p className="text-amber-600 text-sm sm:text-base font-medium">
              September 2025
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced floating elements with better animations */}
      <div className="absolute top-1/4 left-4 sm:left-8 text-4xl sm:text-6xl opacity-20 animate-bounce" style={{animationDelay: '1s', animationDuration: '3s'}}>🌸</div>
      <div className="absolute top-1/3 right-8 sm:right-12 text-3xl sm:text-5xl opacity-20 animate-bounce" style={{animationDelay: '2s', animationDuration: '2.5s'}}>🌺</div>
      <div className="absolute bottom-1/4 left-8 sm:left-16 text-3xl sm:text-4xl opacity-20 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}>🌼</div>
      <div className="absolute bottom-1/3 right-4 sm:right-8 text-4xl sm:text-5xl opacity-20 animate-bounce" style={{animationDelay: '1.5s', animationDuration: '2.8s'}}>🌻</div>
      
      {/* Additional floating elements */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl opacity-10 animate-spin" style={{animationDuration: '15s'}}>✨</div>


      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slowSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default OnamCelebration;