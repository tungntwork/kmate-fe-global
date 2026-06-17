'use client';

import Link from 'next/link';
import { Button } from 'antd';
import { LockOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-sans relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[35%] h-[35%] bg-[#7C4DFF]/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#00e5ff]/10 rounded-full blur-[180px]" />
        {/* Cyber grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,229,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="fixed left-[15%] top-[25%] w-2 h-2 bg-[#00e5ff] rounded-full blur-[2px] opacity-40 animate-pulse pointer-events-none" />
      <div className="fixed right-[20%] top-[35%] w-1.5 h-1.5 bg-[#7C4DFF] rounded-full blur-[2px] opacity-40 animate-ping pointer-events-none" />
      <div className="fixed left-[60%] bottom-[20%] w-2.5 h-2.5 bg-[#00e5ff] rounded-full blur-[2px] opacity-30 animate-pulse pointer-events-none" />

      <PublicHeader />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Glow behind card */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C4DFF]/20 to-[#00e5ff]/20 rounded-3xl blur-3xl scale-105" />

            <div
              className="relative rounded-3xl p-10 text-center"
              style={{
                background: 'rgba(11, 11, 15, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                boxShadow: '0 0 40px rgba(239,68,68,0.1), 0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-20 h-20 mx-auto mb-7 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)',
                }}
              >
                <LockOutlined className="text-3xl text-red-400" />
              </motion.div>

              {/* Error badge */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400/70 mb-3"
              >
                Error 401 &mdash; Unauthorized
              </motion.p>

              {/* Title */}
              <h1 className="text-3xl font-black mb-3">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Phiên đã hết hạn
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Phiên đăng nhập của bạn đã hết hạn hoặc không hợp lệ.
                <br />
                Vui lòng đăng nhập lại để tiếp tục.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link href="/login">
                  <Button
                    size="large"
                    block
                    className="!h-12 !rounded-xl !font-bold !border-0 !text-background-dark !transition-all !duration-200 hover:!scale-[1.02] active:!scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
                      boxShadow: '0 0 20px rgba(124,77,255,0.4), 0 4px 12px rgba(0,0,0,0.3)',
                    }}
                    icon={<ReloadOutlined />}
                  >
                    Đăng nhập lại
                  </Button>
                </Link>
                <Link href="/">
                  <Button
                    size="large"
                    block
                    className="!h-12 !rounded-xl !font-medium !bg-white/5 !border !border-slate-700/50 !text-white hover:!bg-white/10 !transition-all"
                    icon={<HomeOutlined />}
                  >
                    Về trang chủ
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
