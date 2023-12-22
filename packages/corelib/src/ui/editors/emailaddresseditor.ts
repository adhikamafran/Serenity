﻿import { Decorators } from "../../decorators";
import { WidgetProps } from "../widgets/widget";
import { StringEditor } from "./stringeditor";

@Decorators.registerEditor('Serenity.EmailAddressEditor')
@Decorators.element("<input type=\"email\"/>")
export class EmailAddressEditor<P = {}> extends StringEditor<P> {
    constructor(props: WidgetProps<P>) {
        super(props);
        this.domNode?.classList.add('email');
    }
}