// import { Injectable } from "@angular/core";
// import { DefaultUrlSerializer, UrlTree } from "@angular/router";

// @Injectable()
// export class EncodedUrlSerializer extends DefaultUrlSerializer {
//   override parse(url: string): UrlTree {
//     const tree = super.parse(url);
//     // Decode each path segment
//     tree.root.children['primary']?.segments.forEach(segment => {
//       segment.path = decodeURIComponent(atob(segment.path));
//     });
//     return tree;
//   }

//   override serialize(tree: UrlTree): string {
//     // Encode each path segment
//     tree.root.children['primary']?.segments.forEach(segment => {
//       segment.path = btoa(encodeURIComponent(segment.path));
//     });
//     return super.serialize(tree);
//   }
// }