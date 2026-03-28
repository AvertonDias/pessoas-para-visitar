import { ListTodo } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full bg-primary text-primary-foreground py-4 sm:py-6 shadow-md">
      <div className="container mx-auto flex items-center justify-center gap-3 px-4">
        <ListTodo className="h-8 w-8 sm:h-10 sm:w-10" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          ListaNomes PWA
        </h1>
      </div>
    </header>
  );
}
