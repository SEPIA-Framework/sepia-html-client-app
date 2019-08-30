//TODO: this is a very basic early preview of the new contacts lib. Everything can still change ;-)

function sepiaFW_build_account_contacts(){
    var Contacts = {};

    var contactsFromChat = SepiaFW.data.get("contacts-from-chat") || {};
    var contactsFromChatUpdateTimer;
    var contactsFromChatUpdateBufferDelay = 6000;

    Contacts.getContactsFromChat = function(){
        return contactsFromChat;
    }
    Contacts.addContactFromChat = function(contact){
        if (contact.id){
            //add or overwrite
            contactsFromChat[contact.id] = {
                id: contact.id,
                name: contact.name,
                lastUpdated: new Date().getTime()
            };
            //console.error("Added: " + JSON.stringify(contact));   //DEBUG
            
            //write to local storage
            if (contactsFromChatUpdateTimer) clearTimeout(contactsFromChatUpdateTimer);
            contactsFromChatUpdateTimer = setTimeout(function(){
                SepiaFW.data.set("contacts-from-chat", contactsFromChat);
            }, contactsFromChatUpdateBufferDelay);
        }
    }

    /**
     * Get name of a user from channel user-list or any contact the client remembers.
     */
    Contacts.getNameOfUser = function(userId){
        //check active user list first (most recent information)
        var user = SepiaFW.client.getFirstActiveChannelUserById(userId);
        //if that fails check previously stored users
        if (user){
            return user.name;
        }else{
            user = contactsFromChat[userId];
            if (user){
                return user.name;
            }
        }
        return;
    }

    return Contacts;
}