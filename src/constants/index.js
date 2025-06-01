import { records, screening, user, apps, research, dna, aiAgent } from "../assets";
import { Presentation } from 'lucide-react';

export const navlinks = [
  {
    name: "dashboard",
    imgUrl: dna,
    link: "/medical-records/pat12345",
  },
  {
    name: "research",
    imgUrl: research,
    link: "/medical-records/pat12344/research",
  },
  {
    name: "mutations",
    imgUrl: dna,
    link: "/mutation-explorer/pat12345",
  },
  {
    name: "agents",
    imgUrl: aiAgent,
    link: "/agent-dashboard",
  },
  {
    name: "agentStudio",
    imgUrl: aiAgent,
    link: "/agent-studio",
  },
  // {
  //   name: "profile",
  //   imgUrl: user,
  //   link: "/profile",
  // },
  // {
  //   name: 'Investor Slideshow',
  //   icon: Presentation,
  //   path: '/investor-slideshow'
  // }
];
