import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ProductCardSkeleton: React.FC = () => {
  return (
    <Card className="flex flex-col overflow-hidden shadow-sm border border-gray-100 h-full bg-white rounded-2xl">
      <CardContent className="flex-1 p-5">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="px-5 pb-5 pt-0 mt-auto">
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-10 w-20 rounded-xl ml-auto" />
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCardSkeleton;
