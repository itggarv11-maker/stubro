
import React from 'react';
import { Subject } from './types';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { LightBulbIcon } from './components/icons/LightBulbIcon';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';
import { ChatBubbleIcon } from './components/icons/ChatBubbleIcon';
import { BeakerIcon } from './components/icons/BeakerIcon';
import { GlobeAltIcon } from './components/icons/GlobeAltIcon';
import { ScaleIcon } from './components/icons/ScaleIcon';
import { CpuChipIcon } from './components/icons/CpuChipIcon';


export const SUBJECTS: { name: Subject; icon: React.ReactNode }[] = [
  { name: Subject.Math, icon: <LightBulbIcon className="w-6 h-6" /> },
  { name: Subject.Physics, icon: <LightBulbIcon className="w-6 h-6" /> },
  { name: Subject.Chemistry, icon: <BeakerIcon className="w-6 h-6" /> },
  { name: Subject.Biology, icon: <BookOpenIcon className="w-6 h-6" /> },
  { name: Subject.Science, icon: <BeakerIcon className="w-6 h-6" /> },
  { name: Subject.History, icon: <GlobeAltIcon className="w-6 h-6" /> },
  { name: Subject.Geography, icon: <GlobeAltIcon className="w-6 h-6" /> },
  { name: Subject.SST, icon: <ScaleIcon className="w-6 h-6" /> },
  { name: Subject.English, icon: <ChatBubbleIcon className="w-6 h-6" /> },
  { name: Subject.ComputerScience, icon: <CpuChipIcon className="w-6 h-6" /> },
];

export const CLASS_LEVELS: string[] = [
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12", "Any"
];
