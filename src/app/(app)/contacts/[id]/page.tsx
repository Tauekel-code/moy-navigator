import { ContactDetailView } from "@/components/contacts/ContactDetailView";

export default async function ContactDetailPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  return <ContactDetailView id={id} />;
}
