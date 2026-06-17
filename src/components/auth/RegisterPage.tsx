'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Checkbox } from 'antd';
import { App } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { motion } from 'framer-motion';
import imgKMATELOGO from '../../../assets/img/branding/KMATELOGO.png';
import { authService } from '@/lib/api-services';
import { useAuthStore } from '@/store/auth.store';
import { PublicHeader } from '@/components/layout/PublicHeader';

export function RegisterPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ tất cả các trường.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (!agreeTerms) {
      setError('Bạn cần đồng ý với Điều khoản sử dụng để tiếp tục.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({ name: fullName, email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      const { setTokens, setUser } = useAuthStore.getState();
      setTokens(accessToken, refreshToken);
      setUser(user);
      message.success('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => { router.push('/user/dashboard'); }, 500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/google/login`);
      const data = await response.json();
      if (data?.data?.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        message.error('Không thể khởi tạo đăng ký Google. Vui lòng thử lại.');
      }
    } catch {
      message.error('Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-white font-sans relative overflow-hidden">
      {/* ===== BACKGROUND LAYERS ===== */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7C4DFF]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00e5ff]/20 rounded-full blur-[150px]" />

        {/* Cyber grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <PublicHeader />

      {/* ===== MAIN CONTENT ===== */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-24 pb-12">

        {/* ===== LEFT: Floating badge ===== */}
        <div className="absolute left-[8%] top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-48 h-48"
          >
            <div className="absolute inset-0 bg-[#7C4DFF]/30 rounded-full blur-2xl" />
            <motion.div
              animate={{ rotate: [12, 0, 12] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-full glass border-[rgba(124,77,255,0.3)] rounded-3xl flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-[#7C4DFF]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-300">New Member</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== RIGHT: Floating mascot ===== */}
        <div className="absolute right-[8%] bottom-20 hidden xl:block pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-96 h-96"
          >
            <div className="absolute inset-0 bg-[#00e5ff]/20 rounded-full blur-3xl animate-pulse" />
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAR4HenTVN200iJvXOCOqaO8sZDvexTovOYG7rM8dlbBe9WNjnwLPLgUjeIP9zpNqI_Na71r_ReRAl3kWN-hxFq_ThaU256N9BeDZUwtgFGW9gj-WGLKE6adj6epA-GynO-DCKWrvG01_3sRwiauDSx8m_JOB7Uibh4y03fpeaMpDAmxZyLAOpRDG_6EC2SeF9d1vkRciTPdkLlYOFAPfXYw25CIeKvnchUelSMaUfOCbaMguY_ycnL_zTa2lhSHOK5QgArA7dxhLbp"
              alt="K-MATE AI Robot Mascot"
              width={384}
              height={384}
              className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_30px_rgba(0,229,255,0.4)]"
              priority={false}
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -left-4 glass px-4 py-3 rounded-xl border-[rgba(124,77,255,0.3)]"
            >
              <span className="text-2xl font-bold text-[#7C4DFF]">가자!</span>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== CENTER: Register form card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-xl p-8 border-white/10 relative overflow-hidden group">
            {/* Card top glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#7C4DFF]/10 rounded-full blur-3xl transition-all group-hover:bg-[#7C4DFF]/20 pointer-events-none" />

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                Join{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7C4DFF 0%, #00e5ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  K-MATE
                </span>
              </h2>
              <p className="text-slate-400 text-sm">Bắt đầu hành trình học tiếng Hàn ngay hôm nay.</p>
            </div>

            {/* Form */}
            <form className="space-y-5 relative z-10" onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Tên đầy đủ
                </label>
                <Input
                  size="large"
                  prefix={<UserOutlined className="text-slate-500" />}
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="!bg-slate-900/50 !border !border-slate-700/50 !rounded-xl !py-3 !pl-11 !pr-4 !text-white placeholder:!text-slate-600 hover:!border-[#00e5ff]/50 focus-within:!border-[#00e5ff] !transition-all"
                  style={{ boxShadow: 'none' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Email
                </label>
                <Input
                  size="large"
                  prefix={<MailOutlined className="text-slate-500" />}
                  placeholder="email@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="!bg-slate-900/50 !border !border-slate-700/50 !rounded-xl !py-3 !pl-11 !pr-4 !text-white placeholder:!text-slate-600 hover:!border-[#00e5ff]/50 focus-within:!border-[#00e5ff] !transition-all"
                  style={{ boxShadow: 'none' }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Mật khẩu
                </label>
                <Input.Password
                  size="large"
                  prefix={<LockOutlined className="text-slate-500" />}
                  placeholder="Ít nhất 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone className="text-slate-500" /> : <EyeInvisibleOutlined className="text-slate-500" />
                  }
                  className="!bg-slate-900/50 !border !border-slate-700/50 !rounded-xl !py-3 !pl-11 !pr-4 !text-white placeholder:!text-slate-600 hover:!border-[#00e5ff]/50 focus-within:!border-[#00e5ff] !transition-all"
                  style={{ boxShadow: 'none' }}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Xác nhận mật khẩu
                </label>
                <Input.Password
                  size="large"
                  prefix={<LockOutlined className="text-slate-500" />}
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone className="text-slate-500" /> : <EyeInvisibleOutlined className="text-slate-500" />
                  }
                  className="!bg-slate-900/50 !border !border-slate-700/50 !rounded-xl !py-3 !pl-11 !pr-4 !text-white placeholder:!text-slate-600 hover:!border-[#00e5ff]/50 focus-within:!border-[#00e5ff] !transition-all"
                  style={{ boxShadow: 'none' }}
                />
              </div>

              {/* Terms */}
              <Checkbox
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="[&_.ant-checkbox-inner]:!bg-slate-900/50 [&_.ant-checkbox-inner]:!border-slate-700/50 [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-[#00e5ff] [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-[#00e5ff] [&_.ant-checkbox-wrapper:hover_.ant-checkbox-inner]:!border-[#00e5ff]/50"
              >
                <span className="text-slate-400 text-sm">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#00e5ff] hover:underline">
                    Điều khoản dịch vụ
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[#00e5ff] hover:underline">
                    Chính sách bảo mật
                  </Link>
                </span>
              </Checkbox>

              {/* Error message */}
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 animate-[fadeIn_0.3s_ease-out]">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="!font-bold !h-12 !rounded-xl !border-0 !text-background-dark !transition-all !duration-200 hover:!scale-[1.02] active:!scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
                  boxShadow: '0 0 15px rgba(124,77,255,0.3), 0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                Tạo tài khoản miễn phí
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="w-full border-t border-slate-800" />
                <span className="absolute px-3 bg-background-dark text-slate-500 text-xs font-bold uppercase">
                  hoặc đăng ký với
                </span>
              </div>

              {/* Google */}
              <Button
                size="large"
                block
                onClick={handleGoogleRegister}
                className="!h-12 !rounded-xl !font-medium !bg-white/5 !border !border-slate-700/50 !text-white hover:!bg-white/10 hover:!border-slate-600/50 !transition-all !duration-200 flex !items-center !justify-center gap-3"
                icon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M12 5.04c1.94 0 3.51.68 4.7 1.81l3.48-3.48C18.1 1.44 15.3 0 12 0 7.31 0 3.32 2.67 1.32 6.56l3.99 3.1c.95-2.85 3.6-4.62 6.69-4.62z" fill="#EA4335" />
                    <path d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.3h6.44c-.28 1.44-1.1 2.66-2.33 3.48l3.61 2.81c2.11-1.94 3.33-4.8 3.33-8.32z" fill="#4285F4" />
                    <path d="M5.31 14.44c-.24-.72-.37-1.5-.37-2.31s.13-1.59.37-2.31L1.32 6.56C.48 8.17 0 9.99 0 12s.48 3.83 1.32 5.44l3.99-3.12z" fill="#FBBC05" />
                    <path d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.61-2.81c-1.1.74-2.5 1.18-4.33 1.18-3.09 0-5.74-2.07-6.68-4.85l-3.99 3.12C3.32 21.33 7.31 24 12 24z" fill="#34A853" />
                  </svg>
                }
              >
                Tiếp tục với Google
              </Button>
            </form>

            {/* Footer link */}
            <p className="text-center mt-8 text-slate-400 text-sm relative z-10">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-[#00e5ff] font-bold hover:underline ml-1">
                Đăng nhập
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      {/* ===== FLOATING PARTICLES ===== */}
      <div className="absolute left-1/4 bottom-1/4 w-4 h-4 bg-[#00e5ff] rounded-full blur-sm opacity-50 animate-ping pointer-events-none" />
      <div className="absolute right-1/4 top-1/4 w-3 h-3 bg-[#7C4DFF] rounded-full blur-sm opacity-50 animate-pulse pointer-events-none" />

      {/* ===== FOOTER ===== */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 text-center z-0 opacity-40">
        <p className="text-xs text-slate-500 tracking-widest uppercase font-bold">
          Powered by NeuralCore 4.0 &copy; 2026 K-MATE Labs
        </p>
      </footer>
    </div>
  );
}
