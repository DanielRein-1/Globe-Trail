import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/lib/db/prisma";

/**
 * Configuration options for NextAuth.js.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  // Use the Prisma adapter to store user and session data in the database.
  adapter: PrismaAdapter(db),

  // Configure one or more authentication providers.
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // Use JSON Web Tokens for session management.
  session: {
    strategy: "jwt",
  },

  // Callbacks are functions that are called during the execution of NextAuth.js.
  // They can be used to control what happens when an action is performed.
  callbacks: {
    // The session callback is called whenever a session is checked.
    session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }

      return session;
    },

    // The JWT callback is called whenever a JSON Web Token is created or updated.
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!dbUser) {
        if (user) {
          token.id = user?.id;
        }
        return token;
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
  },
};
