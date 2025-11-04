import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const ProductCardSkeleton: React.FC = () => {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg h-full">
      <CardHeader className="p-0">
        <AspectRatio ratio={16 / 9}>
          <Skeleton className="w-full h-full" />
        </AspectRatio>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6 mb-1" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/3 mt-3" />
      </CardContent>
      <CardFooter className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <Skeleton className="h-10 w-2/5" />
        <Skeleton className="h-10 w-2/5" />
      </CardFooter>
    </Card>
  );
};

export default ProductCardSkeleton;