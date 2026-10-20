# Bundled photographic references

These images are downloaded into `frontend/public/images/` so the application does not fetch remote imagery at runtime. They are decorative inspiration references; they do not identify confirmed vendors, venues or availability. No generated-image or paid API was used.

| Local asset | Source image |
| --- | --- |
| wedding.jpg | https://images.unsplash.com/photo-1519225421980-715cb0215aed |
| garden.jpg | https://images.unsplash.com/photo-1511795409834-ef04bbd61622 |
| birthday.jpg | https://images.unsplash.com/photo-1513151233558-d860c5398176 |
| meetup.jpg | https://images.unsplash.com/photo-1517245386807-bb43f82c33c4 |

Photos sourced from Unsplash. Review the [Unsplash license](https://unsplash.com/license) before reusing beyond this application. The product labels these as reference photography.

Momenta uses optimized WebP derivatives of these same photographs (maximum dimension 1400px, quality 82), generated locally with Pillow. Manrope is bundled locally through `@fontsource-variable/manrope` under its SIL Open Font License; a copy is distributed at `frontend/public/licenses/Manrope-OFL.txt`. The Momenta mark is an original SVG implemented in this repository. No external image or font requests are needed at runtime.
