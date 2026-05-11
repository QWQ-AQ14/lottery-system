import React from 'react';
import Index from '@/pages/Index';
import router from '@/config/router.json';
import { Gift } from 'lucide-react';

const routeMap = {
  Index: <Index />
};

const routerIconMap = {
  Index: Gift
};

export const navItems = Object.entries(router).map(([key, value]) => ({
  title: value.title,
  to: value.path,
  page: routeMap[key as keyof typeof routeMap],
  isDefault: value.isDefault,
  icon: routerIconMap[key as keyof typeof routerIconMap]
}));
