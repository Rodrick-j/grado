'use client';
import {
  LayoutDashboard, Stethoscope, UserCog, CalendarDays, ClipboardList,
  Siren, FileText, MessageSquare, FlaskConical, ScanLine, Pill,
  ShieldCheck, Lock, Settings, Heart, Baby, Scissors, Activity,
  Droplets, Microscope, Brain, HeartHandshake, Sun, Eye, EyeOff, Ear,
  Shield, Wind, Gauge, Bone, Users, Clock, Bed, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Bell, Search, Menu, X, Plus, Filter, Download, Upload,
  MoreHorizontal, Edit, Trash2, EyeIcon, Check,
  TrendingUp, TrendingDown, Minus, ArrowRight, ArrowLeft,
  ZoomIn, ZoomOut, RefreshCw, LogOut, User, HelpCircle,
  Building2, Map, AlertCircle, Info, CheckCircle2, XCircle,
  Printer, Share2, Bookmark, Star, Hash, Phone, Mail,
  Calendar, Clock3, BarChart3, PieChart, LineChart,
  Package, Truck, CreditCard, DollarSign,
  Thermometer, BarChart2,
  // Added missing icons
  BedDouble, CheckCircle, CornerDownLeft, Eraser, HeartPulse, Landmark, List, Loader2, Moon, PackagePlus, Receipt, Save, Scan, SearchX, Send, ShieldAlert, UserCheck, UserPlus,
  Inbox, PanelRight, Maximize2
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  LayoutDashboard, Stethoscope, UserCog, CalendarDays, ClipboardList,
  Siren, FileText, MessageSquare, FlaskConical, ScanLine, Pill,
  ShieldCheck, Lock, Settings, Heart, Baby, Scissors, Activity,
  Droplets, Microscope, Brain, HeartHandshake, Sun, Eye, EyeOff, Ear,
  Shield, Wind, Gauge, Bone, Users, Clock, Bed, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Bell, Search, Menu, X, Plus, Filter, Download, Upload,
  MoreHorizontal, Edit, Trash2, EyeIcon, Check,
  TrendingUp, TrendingDown, Minus, ArrowRight, ArrowLeft,
  ZoomIn, ZoomOut, RefreshCw, LogOut, User, HelpCircle,
  Building2, Map, AlertCircle, Info, CheckCircle2, XCircle,
  Printer, Share2, Bookmark, Star, Hash, Phone, Mail,
  Calendar, Clock3, BarChart3, PieChart, LineChart,
  Package, Truck, CreditCard, DollarSign,
  Thermometer, BarChart2,
  // Added missing icons
  BedDouble, CheckCircle, CornerDownLeft, Eraser, HeartPulse, Landmark, List, Loader2, Moon, PackagePlus, Receipt, Save, Scan, SearchX, Send, ShieldAlert, UserCheck, UserPlus,
  Inbox, PanelRight, Maximize2
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export function Icon({ name, size = 16, className = '', strokeWidth = 1.75, style, onClick }: IconProps) {
  const Component = ICON_MAP[name];
  if (!Component) {
    return <span className={className} style={{ display: 'inline-block', width: size, height: size, ...style }} onClick={onClick} />;
  }
  if (onClick) {
    return (
      <span className={className} style={{ display: 'inline-flex', cursor: 'pointer', ...style }} onClick={onClick}>
        <Component size={size} strokeWidth={strokeWidth} />
      </span>
    );
  }
  return <Component size={size} className={className} strokeWidth={strokeWidth} style={style as React.CSSProperties} />;
}
