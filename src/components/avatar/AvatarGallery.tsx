/**
 * Avatar Gallery
 * Showcase and testing component for the SumoAvatar system
 * Displays all avatar variations including nationalities, age stages, and hairstyles
 */

import { SumoAvatar } from "./SumoAvatar";
import type { AvatarConfig } from "@/engine/types/avatar";
import { generateAvatarConfig } from "@/engine/avatarGenerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const NATIONALITIES = ["Japan", "Mongolia", "Georgia", "Russia", "Brazil", "USA"];
const AGE_STAGES = [
  { age: 18, label: "Teen (18)" },
  { age: 22, label: "Young (22)" },
  { age: 28, label: "Prime (28)" },
  { age: 35, label: "Veteran (35)" },
  { age: 45, label: "Elder (45)" },
];
const EXPRESSIONS = ["neutral", "determined", "confident", "intense"] as const;
const HAIRSTYLES = ["oichomage", "chonmage", "retired", "oyakata"] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-display">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-6 items-end">{children}</div>
      </CardContent>
    </Card>
  );
}

function AvatarItem({
  config,
  label,
  size = "md",
  showHairstyle = true,
}: {
  config: AvatarConfig;
  label: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showHairstyle?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <SumoAvatar config={config} size={size} showHairstyle={showHairstyle} />
      <Badge variant="outline" className="text-xs">
        {label}
      </Badge>
    </div>
  );
}

export function AvatarGallery() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold font-display mb-6 text-primary">Avatar Gallery</h1>
      <p className="text-muted-foreground mb-8">
        Showcase of the procedural avatar system. Each avatar is deterministically generated based
        on seed, nationality, age, and status.
      </p>

      <Tabs defaultValue="nationalities" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="nationalities">Nationalities</TabsTrigger>
          <TabsTrigger value="ages">Age Stages</TabsTrigger>
          <TabsTrigger value="expressions">Expressions</TabsTrigger>
          <TabsTrigger value="hairstyles">Hairstyles</TabsTrigger>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
        </TabsList>

        {/* Nationalities Tab */}
        <TabsContent value="nationalities">
          <GallerySection title="Nationality Variations (Age 25, Sekitori)">
            {NATIONALITIES.map((nat) => {
              const config = generateAvatarConfig({
                seed: `gallery-${nat.toLowerCase()}`,
                nationality: nat,
                age: 25,
                isSekitori: true,
              });
              return <AvatarItem key={nat} config={config} label={nat} size="lg" />;
            })}
          </GallerySection>

          <GallerySection title="Same Seed, Different Nationalities">
            {NATIONALITIES.slice(0, 4).map((nat) => {
              const config = generateAvatarConfig({
                seed: "same-seed-demo",
                nationality: nat,
                age: 25,
                isSekitori: true,
              });
              return <AvatarItem key={nat} config={config} label={nat} size="lg" />;
            })}
          </GallerySection>
        </TabsContent>

        {/* Age Stages Tab */}
        <TabsContent value="ages">
          <GallerySection title="Age Progression (Japan, Sekitori)">
            {AGE_STAGES.map(({ age, label }) => {
              const config = generateAvatarConfig({
                seed: `gallery-age-${age}`,
                nationality: "Japan",
                age,
                isSekitori: true,
              });
              return <AvatarItem key={age} config={config} label={label} size="lg" />;
            })}
          </GallerySection>

          <GallerySection title="Same Rikishi, Aging Over Time">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Same seed at different ages showing wrinkles and hair graying:
              </p>
              <div className="flex flex-wrap gap-6 items-end">
                {[18, 25, 35, 45, 55, 65].map((age) => {
                  const config = generateAvatarConfig({
                    seed: "same-rikishi-aging",
                    nationality: "Japan",
                    age,
                    isSekitori: age < 40,
                  });
                  return <AvatarItem key={age} config={config} label={`Age ${age}`} size="lg" />;
                })}
              </div>
            </div>
          </GallerySection>
        </TabsContent>

        {/* Expressions Tab */}
        <TabsContent value="expressions">
          <GallerySection title="Expression Variations">
            {EXPRESSIONS.map((expr) => {
              const config = generateAvatarConfig({
                seed: "expression-demo",
                nationality: "Japan",
                age: 28,
                isSekitori: true,
              });
              return (
                <div key={expr} className="flex flex-col items-center gap-2">
                  <SumoAvatar config={config} size="lg" expression={expr} />
                  <Badge variant="outline" className="text-xs capitalize">
                    {expr}
                  </Badge>
                </div>
              );
            })}
          </GallerySection>
        </TabsContent>

        {/* Hairstyles Tab */}
        <TabsContent value="hairstyles">
          <GallerySection title="Hairstyle Types">
            {HAIRSTYLES.map((style) => {
              const config = generateAvatarConfig({
                seed: "hairstyle-demo",
                nationality: "Japan",
                age: style === "oyakata" ? 50 : 30,
                isSekitori: style !== "retired" && style !== "oyakata",
                isRetired: style === "retired",
                isOyakata: style === "oyakata",
              });
              return (
                <AvatarItem
                  key={style}
                  config={config}
                  label={style}
                  size="lg"
                  showHairstyle={true}
                />
              );
            })}
          </GallerySection>

          <GallerySection title="Without Hairstyle (Clean Shaven Look)">
            {HAIRSTYLES.slice(0, 2).map((style) => {
              const config = generateAvatarConfig({
                seed: "no-hair-demo",
                nationality: "Japan",
                age: 30,
                isSekitori: true,
              });
              return (
                <AvatarItem
                  key={style}
                  config={config}
                  label={`${style} (hidden)`}
                  size="lg"
                  showHairstyle={false}
                />
              );
            })}
          </GallerySection>
        </TabsContent>

        {/* Sizes Tab */}
        <TabsContent value="sizes">
          <GallerySection title="Size Variations">
            {SIZES.map((size) => {
              const config = generateAvatarConfig({
                seed: "size-demo",
                nationality: "Mongolia",
                age: 28,
                isSekitori: true,
              });
              return (
                <div key={size} className="flex flex-col items-center gap-2">
                  <SumoAvatar config={config} size={size} showHairstyle={true} />
                  <Badge variant="outline" className="text-xs uppercase">
                    {size}
                  </Badge>
                </div>
              );
            })}
          </GallerySection>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Avatar System Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Deterministic:</strong> Same seed always produces
            the same face
          </p>
          <p>
            <strong className="text-foreground">Nationality-Aware:</strong> Skin tones match rikishi
            origin (Japanese, Mongolian, Georgian, etc.)
          </p>
          <p>
            <strong className="text-foreground">Age Progression:</strong> Wrinkles and hair graying
            increase with age
          </p>
          <p>
            <strong className="text-foreground">Hairstyles:</strong> Oichomage (sekitori), Chonmage
            (non-sekitori), Retired, Oyakata
          </p>
          <p>
            <strong className="text-foreground">Expressions:</strong> Neutral, Determined,
            Confident, Intense
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AvatarGallery;
